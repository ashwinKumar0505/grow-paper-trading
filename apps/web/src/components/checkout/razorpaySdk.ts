export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

export interface RazorpayOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    vpa?: string;
    method?: 'upi' | 'card' | 'netbanking' | 'emandate';
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let sdkLoadPromise: Promise<boolean> | null = null;

/**
 * Loads the official Razorpay Checkout.js script on demand and caches the result.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener('error', () => {
        sdkLoadPromise = null;
        resolve(false);
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      sdkLoadPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

export interface LaunchRazorpayParams {
  keyId: string;
  paymentType: 'subscription' | 'order';
  amount: number;
  orderId?: string;
  subscriptionId?: string;
  description: string;
  userName: string;
  userEmail: string;
  notes: Record<string, string>;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onFailure: (message: string) => void;
  onDismiss: () => void;
}

/**
 * Loads Razorpay Checkout.js and opens the Razorpay payment modal.
 */
export async function launchRazorpayCheckout(params: LaunchRazorpayParams): Promise<boolean> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    params.onFailure('Failed to load Razorpay Checkout. Please check your connection and try again.');
    return false;
  }

  const baseOptions = {
    key: params.keyId,
    name: 'Tradedia',
    description: params.description,
    prefill: {
      name: params.userName,
      email: params.userEmail,
    },
    notes: params.notes,
    theme: { color: '#10B981' },
    modal: { ondismiss: params.onDismiss },
    handler: params.onSuccess,
  };

  const options: RazorpayOptions =
    params.paymentType === 'subscription' && params.subscriptionId
      ? { ...baseOptions, subscription_id: params.subscriptionId }
      : { ...baseOptions, amount: params.amount, currency: 'INR', order_id: params.orderId };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', (failure) => {
    params.onFailure(failure.error?.description || 'Payment failed or was declined.');
  });
  rzp.open();
  return true;
}
