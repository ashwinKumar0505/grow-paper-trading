import fs from 'fs';
import path from 'path';
import {
  createEmptyStore,
  type DurableAuditEntry,
  type StoreSchema,
} from './durableTypes';
import { FirestoreRestClient, resolveFirestoreConfig } from './firestoreRestClient';
import { FirestoreStoreAdapter } from './firestoreStoreAdapter';

export * from './durableTypes';

export type StorageMode = 'firestore' | 'disk' | 'memory';

function resolveDefaultStorePath(): string {
  const configured = process.env.TRADEDIA_STORAGE_PATH ?? process.env.NIFTYLENS_STORAGE_PATH;
  if (configured) return configured;
  const dataDir = path.resolve(process.cwd(), '.data');
  const current = path.join(dataDir, 'tradedia-store.json');
  const legacy = path.join(dataDir, 'niftylens-store.json');
  try {
    if (!fs.existsSync(current) && fs.existsSync(legacy)) fs.renameSync(legacy, current);
  } catch {
    // Keep current path if rename fails.
  }
  return current;
}

export class DurableStore {
  private state: StoreSchema;
  private filePath: string | null;
  private inMemoryOnly: boolean;
  private firestoreAdapter: FirestoreStoreAdapter | null = null;
  private locks = new Map<string, Promise<unknown>>();
  private flushChain: Promise<void> = Promise.resolve();
  private flushPending = false;
  private initialized = false;

  constructor(options?: {
    filePath?: string | null;
    inMemoryOnly?: boolean;
    firestoreAdapter?: FirestoreStoreAdapter | null;
  }) {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(options?.inMemoryOnly);
    this.inMemoryOnly = isTest;
    this.firestoreAdapter = options?.firestoreAdapter ?? null;
    this.filePath = this.firestoreAdapter
      ? null
      : isTest
        ? options?.filePath ?? null
        : options?.filePath ?? resolveDefaultStorePath();
    this.state = this.loadFromDisk();
  }

  getStorageMode(): StorageMode {
    if (this.firestoreAdapter) return 'firestore';
    if (this.filePath) return 'disk';
    return 'memory';
  }

  async init(env: Record<string, string | undefined> = process.env): Promise<void> {
    if (this.initialized) return;
    if (!this.firestoreAdapter && !this.inMemoryOnly) {
      const cfg = resolveFirestoreConfig(env);
      if (cfg) {
        this.firestoreAdapter = new FirestoreStoreAdapter(new FirestoreRestClient(cfg));
        this.filePath = null;
      }
    }
    if (this.firestoreAdapter) {
      this.state = await this.firestoreAdapter.loadAll();
      const userCount = Object.keys(this.state.users).length;
      const ledgerCount = Object.keys(this.state.tradingLedgers).length;
      console.log(`DurableStore initialized with Firestore (${userCount} users, ${ledgerCount} ledgers).`);
    }
    this.initialized = true;
  }

  private loadFromDisk(): StoreSchema {
    if (!this.filePath) return createEmptyStore();
    try {
      if (!fs.existsSync(this.filePath)) return createEmptyStore();
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoreSchema>;
      return { ...createEmptyStore(), ...parsed };
    } catch {
      return createEmptyStore();
    }
  }

  private scheduleFirestoreSync(): void {
    if (!this.firestoreAdapter) return;
    this.flushPending = true;
    this.flushChain = this.flushChain.then(async () => {
      if (!this.flushPending || !this.firestoreAdapter) return;
      this.flushPending = false;
      try {
        await this.firestoreAdapter.syncDiff(this.state);
      } catch (err) {
        console.error('DurableStore Firestore sync error:', err);
      }
    });
  }

  persist(): void {
    if (this.firestoreAdapter) {
      this.scheduleFirestoreSync();
      return;
    }
    if (!this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${process.pid}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('DurableStore persist error:', err);
    }
  }

  async flush(): Promise<void> {
    if (this.firestoreAdapter) {
      this.scheduleFirestoreSync();
      await this.flushChain;
      return;
    }
    this.persist();
  }

  getState(): StoreSchema {
    return this.state;
  }

  resetForTests(): void {
    this.filePath = null;
    this.firestoreAdapter = null;
    this.initialized = false;
    this.flushPending = false;
    this.state = createEmptyStore();
    this.locks.clear();
  }

  appendAudit(entry: Omit<DurableAuditEntry, 'id' | 'timestamp'> & { timestamp?: number }): void {
    const now = entry.timestamp ?? Date.now();
    this.state.auditLog.push({
      id: `aud_${now}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      userId: entry.userId,
      category: entry.category,
      action: entry.action,
      details: entry.details,
    });
    if (this.state.auditLog.length > 2000) {
      this.state.auditLog = this.state.auditLog.slice(-2000);
    }
  }

  pruneExpiredState(now = Date.now()): number {
    let pruned = 0;
    for (const [email, otp] of Object.entries(this.state.otpRecords)) {
      if (otp.expiresAt <= now) {
        delete this.state.otpRecords[email];
        pruned += 1;
      }
    }
    for (const [jti, exp] of Object.entries(this.state.revokedTokens)) {
      if (exp <= now) {
        delete this.state.revokedTokens[jti];
        pruned += 1;
      }
    }
    return pruned;
  }

  /** Serializes concurrent operations for a specific key (e.g., userId) to guarantee atomicity. */
  async withLock<T>(
    key: string,
    fn: () => Promise<T> | T,
    options?: { persist?: boolean | ((result: T) => boolean) }
  ): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chain = prev.then(() => gate, () => gate);
    this.locks.set(key, chain);
    await prev.catch(() => {});
    try {
      const result = await fn();
      const shouldPersist =
        options?.persist === undefined
          ? true
          : typeof options.persist === 'function'
            ? options.persist(result)
            : options.persist;
      if (shouldPersist) {
        if (this.firestoreAdapter) {
          await this.flush();
        } else {
          this.persist();
        }
      }
      return result;
    } finally {
      release();
      if (this.locks.get(key) === chain) {
        this.locks.delete(key);
      }
    }
  }
}

export const defaultStore = new DurableStore();
