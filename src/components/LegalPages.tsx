import React from 'react';
import { ArrowLeft, ShieldAlert, FileText, Lock, RefreshCw, Mail, CheckCircle2 } from 'lucide-react';
import { AppLink } from '../lib/navigation';

export type LegalPageKind = 'terms' | 'privacy' | 'refund-policy' | 'disclaimer' | 'contact';

interface LegalPageProps {
  kind: LegalPageKind;
}

const LAST_UPDATED = 'November 14, 2026';

export const LegalPage: React.FC<LegalPageProps> = ({ kind }) => {
  const navItems: Array<{ href: string; label: string; id: LegalPageKind }> = [
    { href: '/terms', label: 'Terms of Service', id: 'terms' },
    { href: '/privacy', label: 'Privacy Policy', id: 'privacy' },
    { href: '/refund-policy', label: 'Refund & Cancellation', id: 'refund-policy' },
    { href: '/disclaimer', label: 'SEBI Disclaimer', id: 'disclaimer' },
    { href: '/contact', label: 'Contact & Support', id: 'contact' },
  ];

  const metaMap: Record<
    LegalPageKind,
    { title: string; subtitle: string; icon: React.ReactNode }
  > = {
    terms: {
      title: 'Terms of Service',
      subtitle: 'Rules and conditions governing the use of the Nifty Lens educational platform.',
      icon: <FileText className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How Nifty Lens collects, stores, and protects your account and simulation data.',
      icon: <Lock className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
    'refund-policy': {
      title: 'Cancellation & Refund Policy',
      subtitle: 'Transparent billing, subscription cancellation, and refund eligibility terms.',
      icon: <RefreshCw className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
    disclaimer: {
      title: 'SEBI & Market Risk Disclaimer',
      subtitle: 'Statutory disclosures regarding educational simulation, backtesting, and Indian securities laws.',
      icon: <ShieldAlert className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
    contact: {
      title: 'Contact & Support',
      subtitle: 'Get in touch with our support and compliance team.',
      icon: <Mail className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
  };

  const current = metaMap[kind];

  return (
    <div className="min-h-[calc(100dvh-var(--workspace-header-height))] bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E2E8F0] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AppLink
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#5B7066] dark:text-[#9AB0A5] hover:text-[#00B386] dark:hover:text-[#00D09C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Nifty Lens Home</span>
          </AppLink>
          <span className="text-[11px] font-medium text-[#5B7066] dark:text-[#7F9C8E]">
            Last updated: {LAST_UPDATED}
          </span>
        </div>

        {/* Sub-navigation pills */}
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = item.id === kind;
            return (
              <AppLink
                key={item.id}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-[#00B386] dark:bg-[#00D09C] text-white dark:text-[#082219] border-transparent shadow-xs'
                    : 'bg-white dark:bg-[#111C17] text-[#5B7066] dark:text-[#9AB0A5] border-emerald-900/10 dark:border-[#20332A] hover:border-[#00B386]/40'
                }`}
              >
                {item.label}
              </AppLink>
            );
          })}
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-[#111C17] border border-emerald-900/10 dark:border-[#20332A] rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-start gap-3.5 pb-6 border-b border-emerald-900/10 dark:border-[#20332A]">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              {current.icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#15241D] dark:text-white">
                {current.title}
              </h1>
              <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] mt-1">{current.subtitle}</p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-[#33463D] dark:text-[#C5D4CC]">
            {kind === 'terms' && (
              <>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. Acceptance of Terms</h2>
                  <p>
                    By accessing or subscribing to Nifty Lens (&ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use of the Platform.
                  </p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. Nature of Service (Educational &amp; Simulation Only)</h2>
                  <p>
                    Nifty Lens provides a virtual paper trading simulator, quantitative technical chart screeners, and interactive chart-pattern education modules. All virtual portfolios, balances (₹1,00,000 to ₹50,00,000), order executions, and P&amp;L reports are 100% simulated. No real money, securities, or exchange-traded contracts are bought or sold on Nifty Lens.
                  </p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Not Financial Advice</h2>
                  <p>
                    Nifty Lens is not registered with the Securities and Exchange Board of India (SEBI) as a stock broker, investment adviser, or research analyst. Technical screener outputs, pivot levels, and historical backtests are strictly for educational research and do not constitute investment advice or a solicitation to buy or sell any security.
                  </p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">4. Subscriptions &amp; Payments</h2>
                  <p>
                    Paid membership tiers (Beginner, Advanced, and Virtual Capital Top-ups) unlock software features such as extended screener filters, higher virtual wallet limits, and detailed simulated brokerage breakdowns. Payments are processed securely in INR via Razorpay.
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
                    We collect only the information necessary to operate your account and sync your virtual trading workspace:
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
                    You may request deletion of your account and associated simulation data at any time by contacting our support team at <span className="font-semibold text-[#00B386] dark:text-[#00D09C]">support@niftylens.in</span>.
                  </p>
                </section>
              </>
            )}

            {kind === 'refund-policy' && (
              <>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. Subscription Cancellations</h2>
                  <p>
                    You can cancel your recurring monthly or yearly Nifty Lens subscription at any time. Upon cancellation, your premium software features will remain active until the end of your current billing cycle, and you will not be charged for the subsequent period.
                  </p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">2. Refund Eligibility</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>7-Day Satisfaction Window:</strong> First-time subscribers to Beginner or Advanced plans may request a full refund within 7 days of initial purchase if they are not satisfied with the platform.</li>
                    <li><strong>Duplicate or Failed Charges:</strong> Any accidental duplicate payment or technical billing error will be refunded 100% upon verification.</li>
                    <li><strong>One-Time Virtual Top-ups:</strong> Virtual capital top-ups (₹99) are digital consumables and are non-refundable once credited, unless a technical error occurred.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">3. Processing Time</h2>
                  <p>
                    Approved refunds are initiated within 48 hours and credited back to the original payment method via Razorpay within 5–7 business days. To request a refund, email <span className="font-semibold text-[#00B386] dark:text-[#00D09C]">support@niftylens.in</span> with your Razorpay Payment ID.
                  </p>
                </section>
              </>
            )}

            {kind === 'disclaimer' && (
              <>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                  <strong>Important Statutory Notice:</strong> Nifty Lens is an educational simulation and technical charting tool. It is NOT a SEBI-registered Research Analyst, Investment Adviser, or Stock Broker.
                </div>
                <section className="space-y-2">
                  <h2 className="text-base font-bold text-[#15241D] dark:text-white">1. No Investment Advice or Recommendations</h2>
                  <p>
                    All quantitative screeners, technical indicator filters, candlestick pattern detections, and backtest metrics displayed on Nifty Lens are automated mathematical calculations based on historical price and volume data. They do not represent personalized investment advice or buy/sell recommendations.
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
                    support@niftylens.in
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
                    Nifty Lens Educational Technologies (India)
                  </p>
                  <p className="text-sm font-semibold text-[#00B386] dark:text-[#00D09C]">
                    compliance@niftylens.in
                  </p>
                  <p className="text-[11px] text-[#5B7066] dark:text-[#7F9C8E]">
                    Bengaluru, Karnataka, India
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
