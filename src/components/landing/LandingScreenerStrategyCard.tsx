import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AppLink } from '../../lib/navigation';

export interface StrategyCardFeature {
  title: string;
  desc: string;
}

export interface StrategyCardProps {
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
  features: StrategyCardFeature[];
  footerNote: string;
  ctaText: string;
  ctaHref: string;
}

export const LandingScreenerStrategyCard: React.FC<StrategyCardProps> = ({
  icon,
  tag,
  title,
  description,
  features,
  footerNote,
  ctaText,
  ctaHref,
}) => {
  return (
    <div className="rounded-3xl border border-[#CFDCD5] dark:border-[#20332A] bg-white dark:bg-[#111C17] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#00D09C]/15 text-[#00B386] dark:text-[#00D09C] grid place-items-center">
            {icon}
          </div>
          <span className="rounded-full bg-[#00D09C]/10 border border-[#00D09C]/25 px-3 py-1 text-[11px] font-bold text-[#008F6B] dark:text-[#00D09C]">
            {tag}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-[#15241D] dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed">
          {description}
        </p>

        <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-[#15241D] dark:text-[#D6E6DE]">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#00D09C] shrink-0 mt-0.5" />
              <span>
                <strong>{f.title}:</strong> {f.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-5 border-t border-[#E2EAE6] dark:border-[#20332A] flex items-center justify-between">
        <span className="text-xs text-[#5B7066] dark:text-[#7F9C8E]">{footerNote}</span>
        <AppLink
          href={ctaHref}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#00B386] dark:text-[#00D09C] hover:underline"
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-4 h-4" />
        </AppLink>
      </div>
    </div>
  );
};
