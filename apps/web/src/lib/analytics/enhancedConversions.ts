const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_MAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Normalizes an email address per Google Ads Enhanced Conversions specification:
 * - remove leading/trailing whitespace and convert to lowercase
 * - for gmail.com / googlemail.com only, remove periods (.) preceding `@` (preserving `+` suffixes)
 * - for all other domains, preserve local part characters
 */
export function normalizeEmailForEnhancedConversion(
  rawEmail: string | null | undefined
): string | null {
  if (typeof rawEmail !== 'string') return null;
  const trimmed = rawEmail.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254 || !SIMPLE_EMAIL_RE.test(trimmed)) {
    return null;
  }

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return null;

  let local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (!local || !domain || !domain.includes('.')) return null;

  if (GOOGLE_MAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, '');
    if (!local) return null;
  }

  return `${local}@${domain}`;
}

export function isValidSha256Hex(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  return SHA256_HEX_RE.test(value.trim());
}

/**
 * Computes an ephemeral lowercase hex SHA-256 digest of a verified email address using
 * Web Crypto (`crypto.subtle`). Never persists, caches, or logs the email or hash.
 */
export async function hashEmailForEnhancedConversion(
  rawEmail: string | null | undefined
): Promise<string | null> {
  try {
    const normalized = normalizeEmailForEnhancedConversion(rawEmail);
    if (!normalized) return null;

    const subtle = globalThis.crypto?.subtle;
    if (!subtle || typeof TextEncoder === 'undefined') return null;

    const encoded = new TextEncoder().encode(normalized);
    const digest = await subtle.digest('SHA-256', encoded);
    const bytes = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < bytes.length; i += 1) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return isValidSha256Hex(hex) ? hex : null;
  } catch {
    return null;
  }
}
