import React from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import type { LegalPageKind } from '../LegalPages';

interface LegalPageContentProps {
  kind: LegalPageKind;
}

export const LegalPageContent: React.FC<LegalPageContentProps> = ({ kind }) => {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-[#33463D] dark:text-[#C5D4CC]">
      {kind === 'terms' && (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or subscribing to Tradedia (&ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the Platform.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. Nature of Service (Educational &amp; Simulation Only)</h2>
            <p>
              Tradedia provides a virtual paper trading simulator, quantitative technical chart screeners, and interactive chart-pattern education modules. All virtual portfolios, balances (₹1,00,000 to ₹50,00,000), order executions, and P&amp;L reports are 100% simulated. No real money, securities, or exchange-traded contracts are bought or sold on Tradedia.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Not Financial Advice</h2>
            <p>
              Tradedia is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, investment adviser, or research analyst. Technical screener outputs, pivot levels, and historical backtests are strictly for educational research and do not constitute investment advice or a solicitation to buy or sell any security.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">4. Subscriptions &amp; Payments</h2>
            <p>
              Paid subscription tiers (Beginner and Advanced) unlock software features such as extended screener filters, historical backtesting diagnostics, interactive chart pattern lessons, higher virtual wallet limits, and detailed simulated brokerage breakdowns. Subscriptions renew automatically on a monthly or yearly basis via Razorpay in INR until cancelled.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">5. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.
            </p>
          </section>
        </>
      )}

      {kind === 'privacy' && (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. Information We Collect</h2>
            <p>
              We collect only the information necessary to operate your account and sync your paper trading workspace:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Details:</strong> Name, email address, and authentication identifiers provided when signing in via Firebase Authentication.</li>
              <li><strong>Simulation State:</strong> Virtual wallet balances, paper orders, watchlists, quiz scores, and screener preferences.</li>
              <li><strong>Payment Metadata:</strong> Razorpay order IDs, payment IDs, and subscription status. We do not store your credit/debit card numbers, CVV, or UPI PINs on our servers.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. How We Use Your Data</h2>
            <p>
              Your data is used strictly to authenticate your session, persist your paper trading portfolio, verify subscription access, and respond to support requests. We never sell or rent your personal information to third-party marketers.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Data Retention &amp; Deletion</h2>
            <p>
              You may request deletion of your account and associated simulation data at any time by contacting our support team at <span className="font-semibold text-[#00B386] dark:text-[#00D09C]">support@tradedia.in</span>.
            </p>
          </section>
        </>
      )}

      {kind === 'refund-policy' && (
        <>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. Subscription Cancellations</h2>
            <p>
              You can cancel your recurring monthly or yearly Tradedia subscription at any time. Upon cancellation, your premium software features will remain active until the end of your current billing cycle, and you will not be charged for the subsequent period.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. Refund Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>7-Day Satisfaction Window:</strong> First-time subscribers to Beginner or Advanced plans may request a full refund within 7 days of initial purchase if they are not satisfied with the platform.</li>
              <li><strong>Duplicate or Failed Charges:</strong> Any accidental duplicate payment or technical billing error will be refunded 100% upon verification.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Processing Time</h2>
            <p>
              Approved refunds are initiated within 48 hours and credited back to the original payment method via Razorpay within 5–7 business days. To request a refund, email <span className="font-semibold text-[#00B386] dark:text-[#00D09C]">support@tradedia.in</span> with your Razorpay Payment ID.
            </p>
          </section>
        </>
      )}

      {kind === 'disclaimer' && (
        <>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <strong>Important Statutory Notice:</strong> Tradedia is an educational simulation and technical charting tool. It is NOT a SEBI-registered Research Analyst, Investment Adviser, or Stock Broker.
          </div>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. No Investment Advice or Recommendations</h2>
            <p>
              All quantitative screeners, technical indicator filters, candlestick pattern detections, and backtest metrics displayed on Tradedia are automated mathematical calculations based on historical price and volume data. They do not represent personalized investment advice or buy/sell recommendations.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. Virtual Paper Trading Simulation</h2>
            <p>
              The paper trading desk simulates market orders, limit orders, intraday 5× margin, and estimated statutory charges strictly using virtual credits. Simulated fills do not account for real-world market depth, slippage, liquidity shortages, or exchange circuit halts.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Market Risk</h2>
            <p>
              Investments in the securities market are subject to market risks. Past performance or historical backtest accuracy does not guarantee future returns. Always consult a SEBI-registered financial adviser before deploying real capital.
            </p>
          </section>
        </>
      )}

      {kind === 'contact' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-[#F8FAF9] dark:bg-[#0E1713] border border-emerald-900/10 dark:border-[#20332A] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#15241D] dark:text-white">
              <Mail className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
              <span>Customer Support &amp; Billing</span>
            </div>
            <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5]">
              For subscription help, Razorpay billing queries, or technical issues:
            </p>
            <p className="text-sm font-semibold text-[#00B386] dark:text-[#00D09C]">
              support@tradedia.in
            </p>
            <p className="text-[11px] text-[#5B7066] dark:text-[#7F9C8E]">
              Response time: Within 24 business hours (Mon–Sat, 9:30 AM – 6:30 PM IST)
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#F8FAF9] dark:bg-[#0E1713] border border-emerald-900/10 dark:border-[#20332A] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#15241D] dark:text-white">
              <CheckCircle2 className="w-4 h-4 text-[#00B386] dark:text-[#00D09C]" />
              <span>Compliance &amp; Grievance Officer</span>
            </div>
            <p className="text-xs text-[#5B7066] dark:text-[#9AB0A5]">
              Tradedia Educational Technologies (India)
            </p>
            <p className="text-sm font-semibold text-[#00B386] dark:text-[#00D09C]">
              support@tradedia.in
            </p>
            <p className="text-[11px] text-[#5B7066] dark:text-[#7F9C8E]">
              Bengaluru, Karnataka, India
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
