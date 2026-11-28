import {
  canRequestSignupConversionClaim,
  hashEmailForEnhancedConversion,
  hasDispatchedSignupConversion,
  recordVerifiedSignupConversion,
  type SignupConversionPayload,
} from '../../lib/analytics';
import { getActiveBearerToken } from '../../lib/authSession';

export async function confirmSignupConversionWithBackend(
  conversionId: string,
  explicitToken?: string
): Promise<boolean> {
  try {
    const token = explicitToken || (await getActiveBearerToken());
    if (!token) return false;
    const res = await fetch('/api/auth/confirm-signup-conversion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversionId }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dispatchVerifiedSignupConversion(
  session: {
    signupConversion: SignupConversionPayload | null;
    sessionToken?: string;
  },
  options?: {
    verifiedEmail?: string | null;
    explicitToken?: string;
  }
): Promise<boolean> {
  try {
    const payload = session.signupConversion;
    if (!payload?.eligible || !payload.conversionId) return false;

    if (hasDispatchedSignupConversion(payload.conversionId)) {
      void confirmSignupConversionWithBackend(
        payload.conversionId,
        options?.explicitToken || session.sessionToken
      );
      return false;
    }

    if (!canRequestSignupConversionClaim()) return false;

    const sha256Email = options?.verifiedEmail
      ? await hashEmailForEnhancedConversion(options.verifiedEmail)
      : null;

    // Re-verify advertising measurement consent immediately after async hashing before dispatch.
    if (!canRequestSignupConversionClaim()) return false;

    const dispatched = recordVerifiedSignupConversion(payload, { sha256Email });
    if (dispatched || hasDispatchedSignupConversion(payload.conversionId)) {
      void confirmSignupConversionWithBackend(
        payload.conversionId,
        options?.explicitToken || session.sessionToken
      );
    }
    return dispatched;
  } catch {
    return false;
  }
}
