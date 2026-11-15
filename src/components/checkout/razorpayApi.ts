export interface CreateOrderParams {
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  currentTier: string;
  enableAutoPay: boolean;
  upiId?: string;
  userId: string;
  email: string;
  name: string;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  autoPayEnabled: boolean;
  upiMandateId?: string;
  upiId?: string;
  userId: string;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const res = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function verifyRazorpayPayment(params: VerifyPaymentParams) {
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}
