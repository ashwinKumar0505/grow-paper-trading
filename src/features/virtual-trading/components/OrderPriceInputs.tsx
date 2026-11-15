import { ChevronsUpDown,Lock } from 'lucide-react';
import { OrderType } from '../../../types/market';

import type { OrderTicket } from '../hooks/useOrderTicket';
import { ORDER_TYPE_LABEL } from '../utils/orderTicket';

type Props = Pick<OrderTicket, 'orders' | 'planConfig' | 'orderType' | 'priceText' | 'setPriceText' | 'triggerText' | 'setTriggerText' | 'setError' | 'showTypes' | 'setShowTypes' | 'accent' | 'needsPrice' | 'needsTrigger' | 'value' | 'switchType'>;

export function OrderPriceInputs({ orders, planConfig, orderType, priceText, setPriceText, triggerText, setTriggerText, setError, showTypes, setShowTypes, accent, needsPrice, needsTrigger, value, switchType }: Props) {
  return <>
        {/* Price Row + Order Type Selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypes((s) => !s)}
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <span>Price</span>
              <strong className="font-bold text-gray-900 dark:text-white">
                {ORDER_TYPE_LABEL[orderType]}
              </strong>
              <ChevronsUpDown className="w-3 h-3 text-gray-400" />
            </button>

            {showTypes && (
              <div className="absolute left-0 z-30 mt-1.5 w-44 rounded-xl border border-gray-200 dark:border-[#2E3340] bg-white dark:bg-[#20242F] shadow-xl py-1">
                {([
                  { id: 'MARKET', label: 'Market', desc: 'Execute at best live price', tier: 'free' },
                  { id: 'LIMIT', label: 'Limit', desc: 'Buy/Sell at a target price', tier: 'beginner' },
                  { id: 'SL', label: 'Stop Loss (SL)', desc: 'Trigger + Limit price', tier: 'advanced' },
                  { id: 'SL-M', label: 'SL-Market', desc: 'Trigger at price, fill at market', tier: 'advanced' },
                ] as { id: OrderType; label: string; desc: string; tier: string }[]).map((item) => {
                  const locked = !planConfig.allowedOrderTypes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => switchType(item.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#282D3B] cursor-pointer ${
                        orderType === item.id ? 'bg-gray-50 dark:bg-[#282D3B]' : ''
                      }`}
                    >
                      <div
                        className="text-xs font-semibold flex items-center justify-between"
                        style={{ color: orderType === item.id ? accent : undefined }}
                      >
                        <span>{item.label}</span>
                        {locked && <Lock className="w-3 h-3 text-amber-500" />}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {locked ? `Requires ${item.tier === 'beginner' ? 'Beginner' : 'Advanced'}` : item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {needsPrice ? (
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={priceText}
              onChange={(e) => {
                setPriceText(e.target.value);
                setError('');
              }}
              className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
            />
          ) : (
            <div className="w-[148px] h-9 px-3 rounded-md bg-gray-100/90 dark:bg-[#232732] flex items-center justify-end text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
              At market
            </div>
          )}
        </div>

        {/* Trigger Price Row (for SL / SL-M orders) */}
        {needsTrigger && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Trigger price
            </span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              value={triggerText}
              onChange={(e) => {
                setTriggerText(e.target.value);
                setError('');
              }}
              className="w-[148px] h-9 px-3 text-right text-sm font-semibold tabular-nums rounded-md border border-gray-300 dark:border-[#3A3F4B] bg-white dark:bg-[#1A1D24] text-gray-900 dark:text-white focus:outline-none focus:border-gray-800 dark:focus:border-white"
            />
          </div>
        )}

  </>;
}
