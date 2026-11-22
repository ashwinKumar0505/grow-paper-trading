import {
ChevronDown,
ChevronUp
} from 'lucide-react';
import type { LandingModel } from './useLandingPage';
type Props = Pick<LandingModel, 'openFaqIndex' | 'setOpenFaqIndex' | 'faqs'>;
export function LandingFAQ({ openFaqIndex, setOpenFaqIndex, faqs }: Props) {
return (
<section id="faq" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto space-y-8 text-left">
          <div className="text-center space-y-2">
            <div className="text-xs font-extrabold text-[#00B386] dark:text-[#00D09C] uppercase tracking-wider">
              Simple Answers
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#15241D] dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#5B7066] dark:text-[#9AB0A5]">
              Everything you need to know about Tradedia Stock Screener, Paper Trading, and Pattern Learning.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#111C17] rounded-2xl border border-[#CFDCD5] dark:border-[#20332A] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-bold text-sm sm:text-base text-[#15241D] dark:text-white">
                      {faq.q}
                    </span>
                    <span className="text-[#5B7066] dark:text-[#9AB0A5] shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-[#5B7066] dark:text-[#9AB0A5] leading-relaxed border-t border-[#E2EAE6] dark:border-[#20332A]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
);
}
