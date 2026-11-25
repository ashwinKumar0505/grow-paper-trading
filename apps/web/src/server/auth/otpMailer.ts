import type { DurableStore } from '../storage/durableStore';

export async function deliverOtpEmailViaResend(params: {
  email: string;
  code: string;
  store: DurableStore;
}): Promise<{ status: number; success: boolean; message: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.OTP_FROM_EMAIL || 'Tradedia <onboarding@resend.dev>';
  if (!resendApiKey) {
    delete params.store.getState().otpRecords[params.email];
    params.store.persist();
    return {
      status: 503,
      success: false,
      message: 'Email OTP delivery service is not configured on this server.',
    };
  }

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.email],
        subject: 'Your Tradedia verification code',
        html: `<div style="font-family:sans-serif;padding:16px"><h2>Tradedia Verification</h2><p>Your 6-digit OTP code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${params.code}</p><p>This code expires in 10 minutes. Never share this code with anyone.</p></div>`,
      }),
    });
    if (!emailRes.ok) {
      delete params.store.getState().otpRecords[params.email];
      params.store.persist();
      return {
        status: 502,
        success: false,
        message: 'Unable to deliver verification email right now. Please try again shortly.',
      };
    }
  } catch {
    delete params.store.getState().otpRecords[params.email];
    params.store.persist();
    return {
      status: 502,
      success: false,
      message: 'Unable to reach email delivery service. Please try again shortly.',
    };
  }

  return {
    status: 200,
    success: true,
    message: 'If this email address is eligible, a 6-digit verification code has been sent.',
  };
}
