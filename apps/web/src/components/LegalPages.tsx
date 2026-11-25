import React from 'react';
import { ArrowLeft, ShieldAlert, FileText, Lock, RefreshCw, Mail } from 'lucide-react';
import { AppLink } from '../lib/navigation';
import { LegalPageContent } from './legal/LegalPageContent';

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
      subtitle: 'Rules and conditions governing the use of the Tradedia educational platform.',
      icon: <FileText className="w-5 h-5 text-[#00B386] dark:text-[#00D09C]" />,
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How Tradedia collects, stores, and protects your account and simulation data.',
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
            <span>Back to Tradedia Home</span>
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

          <LegalPageContent kind={kind} />
        </div>
      </div>
    </div>
  );
};
