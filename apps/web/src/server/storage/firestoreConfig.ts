export interface FirestoreConfig {
  projectId: string;
  databaseId: string;
  clientEmail: string;
  privateKey: string;
}

export function normalizePemPrivateKey(raw: string): string {
  let value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as { private_key?: unknown };
      if (typeof parsed.private_key === 'string') value = parsed.private_key.trim();
    } catch { /* fall through */ }
  } else if (!value.includes('BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(value) && value.length > 200) {
    const decoded = Buffer.from(value.replace(/\s+/g, ''), 'base64').toString('utf8').trim();
    if (decoded.includes('BEGIN')) value = decoded;
    else if (decoded.startsWith('{')) {
      try {
        const parsed = JSON.parse(decoded) as { private_key?: unknown };
        if (typeof parsed.private_key === 'string') value = parsed.private_key.trim();
      } catch { /* fall through */ }
    }
  }

  value = value.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').trim();
  const match = value.match(/-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/);
  if (match) {
    const label = match[1];
    const body = match[2].replace(/\s+/g, '');
    const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;
    return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
  }
  return value;
}

export function resolveFirestoreConfig(
  env: Record<string, string | undefined> = process.env
): FirestoreConfig | null {
  let clientEmail = (env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || '').trim();
  let rawKey = (env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
  let projectId = (env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '').trim();

  const jsonBlob = (env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if ((!clientEmail || !rawKey) && jsonBlob) {
    try {
      const decoded = jsonBlob.startsWith('{') ? jsonBlob : Buffer.from(jsonBlob, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as { client_email?: string; private_key?: string; project_id?: string };
      clientEmail = clientEmail || String(parsed.client_email || '').trim();
      rawKey = rawKey || String(parsed.private_key || '').trim();
      projectId = projectId || String(parsed.project_id || '').trim();
    } catch { /* ignore invalid json blob */ }
  }

  if (!clientEmail || !rawKey) return null;
  if ((clientEmail.startsWith('"') && clientEmail.endsWith('"')) || (clientEmail.startsWith("'") && clientEmail.endsWith("'"))) {
    clientEmail = clientEmail.slice(1, -1).trim();
  }

  const databaseId = (
    env.FIREBASE_DATABASE_ID ||
    env.VITE_FIREBASE_DATABASE_ID ||
    '(default)'
  ).trim() || '(default)';

  return {
    projectId: projectId || 'tradedia-b6cb0',
    databaseId,
    clientEmail,
    privateKey: normalizePemPrivateKey(rawKey),
  };
}
