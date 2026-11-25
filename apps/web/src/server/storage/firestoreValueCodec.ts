/**
 * Pure TypeScript codec converting between plain JSON-compatible JS values
 * and Google Cloud Firestore REST v1 Value/Document structures.
 */

export type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export interface FirestoreDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { nullValue: null };
    if (Number.isSafeInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (Array.isArray(value)) {
    return value.length === 0
      ? { arrayValue: {} }
      : { arrayValue: { values: value.map((item) => encodeFirestoreValue(item)) } };
  }
  if (typeof value === 'object') {
    const fields = encodeFirestoreFields(value as Record<string, unknown>);
    return Object.keys(fields).length === 0
      ? { mapValue: {} }
      : { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function encodeFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    fields[key] = encodeFirestoreValue(val);
  }
  return fields;
}

export function decodeFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('stringValue' in value) return String(value.stringValue);
  if ('arrayValue' in value) {
    const vals = value.arrayValue?.values;
    return Array.isArray(vals) ? vals.map((item) => decodeFirestoreValue(item)) : [];
  }
  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue?.fields);
  }
  return null;
}

export function decodeFirestoreFields(
  fields: Record<string, FirestoreValue> | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields) return out;
  for (const [key, val] of Object.entries(fields)) {
    out[key] = decodeFirestoreValue(val);
  }
  return out;
}

/**
 * Produces a Firestore-safe document ID (no `/`, `.`, `..`, or `__.*__`).
 * Safe alphanumeric/underscore/hyphen IDs (like UIDs) pass through unchanged.
 */
export function encodeFirestoreDocId(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (
    trimmed.length > 0 &&
    trimmed.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(trimmed) &&
    !(trimmed.startsWith('__') && trimmed.endsWith('__'))
  ) {
    return trimmed;
  }
  return `k_${Buffer.from(rawKey, 'utf8').toString('base64url')}`;
}

export function extractDocIdFromName(name: string | undefined): string {
  if (!name) return '';
  const idx = name.lastIndexOf('/');
  return idx >= 0 ? name.slice(idx + 1) : name;
}
