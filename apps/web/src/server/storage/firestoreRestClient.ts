import crypto from 'crypto';
import {
  normalizePemPrivateKey,
  resolveFirestoreConfig,
  type FirestoreConfig,
} from './firestoreConfig';
import {
  encodeFirestoreFields,
  type FirestoreDocument,
} from './firestoreValueCodec';

export { normalizePemPrivateKey, resolveFirestoreConfig, type FirestoreConfig };

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const FIRESTORE_API_ORIGIN = 'https://firestore.googleapis.com/v1';
const MAX_COMMIT_WRITES = 450;

export type FirestoreWriteOp =
  | { type: 'set'; collection: string; docId: string; data: Record<string, unknown> }
  | { type: 'delete'; collection: string; docId: string };

export class FirestoreRestClient {
  private config: FirestoreConfig;
  private fetchFn: typeof fetch;
  private cachedToken: { token: string; expiresAtMs: number } | null = null;
  private tokenInFlight: Promise<string> | null = null;

  constructor(config: FirestoreConfig, fetchFn: typeof fetch = fetch) {
    this.config = config;
    this.fetchFn = fetchFn;
  }

  get documentRootPath(): string {
    return `projects/${this.config.projectId}/databases/${this.config.databaseId}/documents`;
  }

  private get baseUrl(): string {
    return `${FIRESTORE_API_ORIGIN}/${this.documentRootPath}`;
  }

  private createSignedJwtAssertion(nowSec: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: this.config.clientEmail,
        sub: this.config.clientEmail,
        scope: FIRESTORE_SCOPE,
        aud: OAUTH_TOKEN_URL,
        iat: nowSec,
        exp: nowSec + 3600,
      })
    ).toString('base64url');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(this.config.privateKey, 'base64url');
    return `${header}.${payload}.${signature}`;
  }

  async getAccessToken(nowMs = Date.now()): Promise<string> {
    if (this.cachedToken && nowMs < this.cachedToken.expiresAtMs - 120_000) {
      return this.cachedToken.token;
    }
    if (this.tokenInFlight) return this.tokenInFlight;

    this.tokenInFlight = (async () => {
      const assertion = this.createSignedJwtAssertion(Math.floor(nowMs / 1000));
      const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      });
      const res = await this.fetchFn(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Firestore OAuth token exchange failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) {
        throw new Error('Firestore OAuth token response did not include access_token.');
      }
      const ttlMs = Math.max(300, Number(data.expires_in || 3600)) * 1000;
      this.cachedToken = { token: data.access_token, expiresAtMs: Date.now() + ttlMs };
      return data.access_token;
    })().finally(() => {
      this.tokenInFlight = null;
    });

    return this.tokenInFlight;
  }

  async listCollection(collection: string): Promise<FirestoreDocument[]> {
    const token = await this.getAccessToken();
    const docs: FirestoreDocument[] = [];
    let pageToken: string | undefined;

    do {
      const qs = new URLSearchParams({ pageSize: '300' });
      if (pageToken) qs.set('pageToken', pageToken);
      const url = `${this.baseUrl}/${encodeURIComponent(collection)}?${qs.toString()}`;
      const res = await this.fetchFn(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) return [];
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Firestore list '${collection}' failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        documents?: FirestoreDocument[];
        nextPageToken?: string;
      };
      if (Array.isArray(json.documents)) {
        docs.push(...json.documents);
      }
      pageToken = json.nextPageToken;
    } while (pageToken);

    return docs;
  }

  async commitWrites(ops: FirestoreWriteOp[]): Promise<void> {
    if (ops.length === 0) return;
    const token = await this.getAccessToken();
    const commitUrl = `${this.baseUrl}:commit`;

    for (let i = 0; i < ops.length; i += MAX_COMMIT_WRITES) {
      const chunk = ops.slice(i, i + MAX_COMMIT_WRITES);
      const writes = chunk.map((op) => {
        const docName = `${this.documentRootPath}/${op.collection}/${op.docId}`;
        if (op.type === 'delete') {
          return { delete: docName };
        }
        return {
          update: {
            name: docName,
            fields: encodeFirestoreFields(op.data),
          },
        };
      });

      const res = await this.fetchFn(commitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ writes }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Firestore commit failed (HTTP ${res.status}): ${text.slice(0, 240)}`);
      }
    }
  }
}
