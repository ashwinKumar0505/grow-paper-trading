import { Lock,X } from 'lucide-react';

import type { OrderTicket } from '../hooks/useOrderTicket';
import type { OrderPanelProps } from '../types/orderTicket';
import { inr } from '../utils/orderTicket';

type Props = Pick<OrderTicket, 'planConfig' | 'openUpgradeModal' | 'exchange' | 'setExchange' | 'setOrderType' | 'setPriceText' | 'showDepth' | 'setShowDepth' | 'nsePrice' | 'bsePrice' | 'depth'> & Pick<OrderPanelProps, 'stock' | 'onClose'>;

export function OrderQuoteHeader({ planConfig, openUpgradeModal, exchange, setExchange, setOrderType, setPriceText, showDepth, setShowDepth, nsePrice, bsePrice, depth, stock, onClose }: Props) {
  return <>
      {/* 1. Stock Title & NSE/BSE Quote Strip + Depth Link */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
              {stock.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-[11.5px] text-gray-500 dark:text-gray-400 tabular-nums">
              <button
                type="button"
                disabled={stock.exchange !== 'NSE'}
                onClick={() => setExchange('NSE')}
                className={`cursor-pointer ${exchange === 'NSE' ? ' font-semibold text-gray-800 dark:text-gray-200' : ''}`}
              >
                NSE {stock.exchange === 'NSE' ? inr(nsePrice) : 'Unavailable'}
              </button>
              <span className={stock.change >= 0 ? 'text-[#00B386] font-medium' : 'text-[#EB5B3C] font-medium'}>
                ({stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
              <span>·</span>
              <button
                type="button"
                disabled={stock.exchange !== 'BSE'}
                onClick={() => setExchange('BSE')}
                className={`cursor-pointer ${exchange === 'BSE' ? 'font-semibold text-gray-800 dark:text-gray-200' : ''}`}
              >
                BSE {stock.exchange === 'BSE' ? inr(bsePrice) : 'Unavailable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!planConfig.allowMarketDepth) {
                    openUpgradeModal({
                      requiredTier: 'advanced',
                      featureName: '5-Level NSE Market Depth (Bids & Asks)',
                      featureDescription:
                        'Inspecting live 5-level Bid/Ask order book depth and click-to-fill limit prices is exclusive to the Advanced Package.',
                    });
                    return;
                  }
                  setShowDepth((prev) => !prev);
                }}
                className="ml-1 font-semibold text-gray-800 dark:text-gray-200 border-b border-dashed border-gray-500 hover:text-[#00B386] cursor-pointer inline-flex items-center gap-1"
              >
                {!planConfig.allowMarketDepth && <Lock className="w-2.5 h-2.5 text-amber-500" />}
                <span>Depth</span>
              </button>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Inline Collapsible Market Depth Drawer */}
        {showDepth && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-[#2A2E39] grid grid-cols-2 gap-3 text-[11px] font-mono tabular-nums">
            <div>
              <div className="flex justify-between text-gray-400 font-sans mb-1">
                <span>Bid</span>
                <span>Qty</span>
              </div>
              {depth.bids.slice(0, 5).map((b, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setOrderType('LIMIT');
                    setPriceText(b.price.toFixed(2));
                  }}
                  className="flex justify-between py-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#232732] rounded px-1"
                  title="Click to use this Bid price as Limit price"
                >
                  <span className="text-[#00B386] font-medium">{b.price.toFixed(2)}</span>
                  <span className="text-gray-600 dark:text-gray-300">{b.quantity}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-gray-400 font-sans mb-1">
                <span>Ask</span>
                <span>Qty</span>
              </div>
              {depth.asks.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setOrderType('LIMIT');
                    setPriceText(a.price.toFixed(2));
                  }}
                  className="flex justify-between py-0.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#232732] rounded px-1"
                  title="Click to use this Ask price as Limit price"
                >
                  <span className="text-[#EB5B3C] font-medium">{a.price.toFixed(2)}</span>
                  <span className="text-gray-600 dark:text-gray-300">{a.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

  </>;
}
