import { buildAuthenticatedHeaders } from '../../lib/authSession';

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

export interface CreateOrderResponse {
  success: boolean;
  mode: 'razorpay_api';
  paymentType?: 'subscription' | 'order';
  keyId: string;
  orderId: string;
  subscriptionId?: string;
  planId?: string;
  amount: number;
  amountInINR: number;
  fullPriceINR?: number;
  creditAppliedINR?: number;
  autoPayEnabled?: boolean;
  upiMandateId?: string | null;
  currency?: string;
  code?: string;
  message?: string;
}

export interface VerifyPaymentParams {
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tier: string;
  billingCycle: 'monthly' | 'yearly';
  autoPayEnabled: boolean;
  upiMandateId?: string;
  upiId?: string;
  userId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verified: boolean;
  idempotentReplay?: boolean;
  message?: string;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
  const headers = await buildAuthenticatedHeaders();
  const res = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function verifyRazorpayPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
  const headers = await buildAuthenticatedHeaders();
  const res = await fetch('/api/payments/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return res.json();
}

export interface SubscriptionStatusResponse {
  success: boolean;
  mode?: 'razorpay_api' | 'local';
  subscriptionId?: string;
  status?: string;
  currentStartMs?: number | null;
  currentEndMs?: number | null;
  chargeAtMs?: number | null;
  endedAtMs?: number | null;
  message?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  cancelled?: boolean;
  mode?: 'razorpay_api' | 'local';
  subscriptionId?: string;
  status?: string;
  currentEndMs?: number;
  endedAtMs?: number;
  message?: string;
}

async function parseJsonSafe<T>(res: Response, fallbackMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }
  return res.json() as Promise<T>;
}

export async function fetchRazorpaySubscriptionStatus(
  subscriptionId?: string
): Promise<SubscriptionStatusResponse> {
  const headers = await buildAuthenticatedHeaders();
  const res = await fetch('/api/payments/subscription-status', {
    method: 'POST',
    headers,
    body: JSON.stringify({ subscriptionId }),
  });
  return parseJsonSafe<SubscriptionStatusResponse>(
    res,
    'Payment endpoint unavailable. Restart the server and try again.'
  );
}

export interface RazorpayBillingItem {
  id: string;
  paymentId: string | null;
  subscriptionId: string | null;
  amountINR: number;
  currency: string;
  status: string;
  createdAt: number;
  receiptUrl: string | null;
  description: string | null;
}

export interface BillingHistoryResponse {
  success: boolean;
  mode?: 'razorpay_api' | 'local';
  items: RazorpayBillingItem[];
  message?: string;
}

export async function fetchRazorpayBillingHistory(params: {
  subscriptionId?: string;
  paymentId?: string;
}): Promise<BillingHistoryResponse> {
  const headers = await buildAuthenticatedHeaders();
  const res = await fetch('/api/payments/billing-history', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseJsonSafe<BillingHistoryResponse>(
    res,
    'Billing endpoint unavailable. Restart the server and try again.'
  );
}

export async function cancelRazorpaySubscription(
  subscriptionId?: string
): Promise<CancelSubscriptionResponse> {
  const headers = await buildAuthenticatedHeaders();
  const res = await fetch('/api/payments/cancel-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify({ subscriptionId }),
  });
  return parseJsonSafe<CancelSubscriptionResponse>(
    res,
    'Payment endpoint unavailable. Restart the server and try again.'
  );
}
