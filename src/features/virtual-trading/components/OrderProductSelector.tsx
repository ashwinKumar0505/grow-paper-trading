import { Lock,Settings } from 'lucide-react';

import type { OrderTicket } from '../hooks/useOrderTicket';

type Props = Pick<OrderTicket, 'holdings' | 'planConfig' | 'openUpgradeModal' | 'product' | 'setProduct' | 'setError' | 'setShowTypes'>;

export function OrderProductSelector({ holdings, planConfig, openUpgradeModal, product, setProduct, setError, setShowTypes }: Props) {
  return <>
        {/* Product Selector Pills + Order Type Settings Gear */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setProduct('DELIVERY');
                setError('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer border ${
                product === 'DELIVERY'
                  ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36] text-gray-900 dark:text-white font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
            >
              Delivery
            </button>

            <button
              type="button"
              onClick={() => {
                if (!planConfig.allowIntradayTrading) {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'Intraday (MIS) 5x Leverage Trading',
                    featureDescription:
                      'Free Starter accounts include Delivery (CNC) trading only. Upgrade to Beginner (₹299/mo) or Advanced (₹699/mo) to unlock Intraday (MIS) 5x margin leverage & short selling.',
                  });
                  return;
                }
                setProduct('INTRADAY');
                setError('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer border inline-flex items-center gap-1 ${
                product === 'INTRADAY'
                  ? 'border-gray-800 dark:border-white bg-gray-100/90 dark:bg-[#252A36] text-gray-900 dark:text-white font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
            >
              {!planConfig.allowIntradayTrading && <Lock className="w-3 h-3 text-amber-500" />}
              <span>Intraday 5x</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!planConfig.allowIntradayTrading) {
                  openUpgradeModal({
                    requiredTier: 'beginner',
                    featureName: 'MTF 5.00x Delivery Leverage',
                    featureDescription:
                      'MTF 5.00x (Pay 20% margin, carry forward delivery holdings) is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                  });
                  return;
                }
                setProduct('MTF');
                setError('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer border inline-flex items-center gap-1 ${
                product === 'MTF'
                  ? 'border-[#00B386] bg-[#00B386]/15 text-[#00B386] dark:text-[#00D09C] font-semibold'
                  : 'border-gray-200 dark:border-[#2E3340] text-gray-600 dark:text-gray-400 hover:border-gray-300 font-medium'
              }`}
              title="MTF 5.00x Delivery Margin (Pay 20%, Hold Delivery)"
            >
              {!planConfig.allowIntradayTrading && <Lock className="w-3 h-3 text-amber-500" />}
              <span>MTF 5.00x</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#2A2E39]">
            <button
              type="button"
              onClick={() => setShowTypes((s) => !s)}
              className="w-7 h-7 rounded-full border border-gray-200 dark:border-[#2E3340] flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
              title="Change Order Type (Market / Limit / SL / SL-M)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

  </>;
}
