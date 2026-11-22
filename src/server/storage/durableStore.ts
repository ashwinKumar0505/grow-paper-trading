import fs from 'fs';
import path from 'path';
import {
  createEmptyStore,
  type DurableAuditEntry,
  type StoreSchema,
} from './durableTypes';

export * from './durableTypes';

/**
 * Resolves the on-disk store path. `TRADEDIA_STORAGE_PATH` is the current
 * setting; `NIFTYLENS_STORAGE_PATH` is the pre-rebrand name and is still read
 * so existing deployments keep pointing at their persistent volume. When the
 * default location is used and only the legacy `niftylens-store.json` exists,
 * it is renamed in place so no saved accounts or ledgers are lost.
 */
function resolveDefaultStorePath(): string {
  const configured = process.env.TRADEDIA_STORAGE_PATH ?? process.env.NIFTYLENS_STORAGE_PATH;
  if (configured) return configured;
  const dataDir = path.resolve(process.cwd(), '.data');
  const current = path.join(dataDir, 'tradedia-store.json');
  const legacy = path.join(dataDir, 'niftylens-store.json');
  try {
    if (!fs.existsSync(current) && fs.existsSync(legacy)) fs.renameSync(legacy, current);
  } catch {
    // If the rename fails, start from the current path; the legacy file is left untouched.
  }
  return current;
}

export class DurableStore {
  private state: StoreSchema;
  private filePath: string | null;
  private locks = new Map<string, Promise<unknown>>();

  constructor(options?: { filePath?: string | null; inMemoryOnly?: boolean }) {
    const isTest = process.env.NODE_ENV === 'test' || options?.inMemoryOnly;
    this.filePath = isTest
      ? options?.filePath ?? null
      : options?.filePath ?? resolveDefaultStorePath();
    this.state = this.loadFromDisk();
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

  persist(): void {
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

  getState(): StoreSchema {
    return this.state;
  }

  resetForTests(): void {
    this.filePath = null;
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

  /** Serializes concurrent operations for a specific key (e.g., userId) to guarantee atomicity. */
  async withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, prev.then(() => gate, () => gate));
    await prev.catch(() => {});
    try {
      const result = await fn();
      this.persist();
      return result;
    } finally {
      release();
      if (this.locks.get(key) === gate) {
        this.locks.delete(key);
      }
    }
  }
}

export const defaultStore = new DurableStore();
