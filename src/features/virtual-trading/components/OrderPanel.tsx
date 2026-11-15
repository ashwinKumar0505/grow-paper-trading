import { AlertCircle } from 'lucide-react';
import React from 'react';
import { OrderAction } from '../../../types/market';
import {
MTF_LEVERAGE,
SCHEDULED_ORDER_DISCLAIMER
} from '../../../utils/orderEngine';

import { useOrderTicket } from '../hooks/useOrderTicket';
import type { OrderPanelProps } from '../types/orderTicket';
import { BUY,inr,SELL } from '../utils/orderTicket';
import { Notice } from './OrderNotices';
import { OrderPriceInputs } from './OrderPriceInputs';
import { OrderProductSelector } from './OrderProductSelector';
import { OrderQuantityInput } from './OrderQuantityInput';
import { OrderQuoteHeader } from './OrderQuoteHeader';
import { OrderSubmitFooter } from './OrderSubmitFooter';

export const OrderPanel: React.FC<OrderPanelProps> = (props) => {
  const { stock, onClose } = props;
  const ticket = useOrderTicket(props);
  const { balance, holdings, action, setAction, product, error, setError, qty, isBuy, position, isExit, value, tradable, intradayBlocked, submit } = ticket;

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#2A2E39] shadow-xs overflow-hidden flex flex-col"
    >
      <OrderQuoteHeader {...ticket} stock={stock} onClose={onClose} />
      {/* 2. BUY / SELL Tabs */}
      <div className="flex items-center gap-6 px-5 border-t border-b border-gray-100 dark:border-[#2A2E39]">
        {(['BUY', 'SELL'] as OrderAction[]).map((a) => {
          const active = action === a;
          const c = a === 'BUY' ? BUY : SELL;
          const tabLabel = tradable
            ? a === 'BUY'
              ? 'Buy'
              : 'Sell'
            : a === 'BUY'
              ? 'Schedule Buy'
              : 'Schedule Sell';
          return (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAction(a);
                setError('');
              }}
              className="py-2.5 text-xs font-bold tracking-wide transition-colors cursor-pointer relative"
              style={{ color: active ? c : undefined }}
            >
              <span className={active ? '' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}>
                {tabLabel}
              </span>
              {active && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2.5px] rounded-t"
                  style={{ backgroundColor: c }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Main Order Inputs */}
      <div className="px-5 pt-4 pb-6 space-y-5 flex-1">
      <OrderProductSelector {...ticket} />
      <OrderQuantityInput {...ticket} />
      <OrderPriceInputs {...ticket} />
        {/* Contextual Information Notices */}
        <div className="min-h-[84px] flex flex-col justify-end space-y-2 pt-2">
          {!tradable && (
            <Notice>
              {SCHEDULED_ORDER_DISCLAIMER}
            </Notice>
          )}
          {intradayBlocked && (
            <Notice warn>
              Intraday cut-off (3:20 PM) passed. Only position exits are permitted during the remainder of today's session.
            </Notice>
          )}
          {product === 'INTRADAY' && tradable && !intradayBlocked && !isExit && (
            <Notice>
              Intraday (MIS) gives <strong>5x leverage</strong> (20% margin). Open positions auto square-off at 3:20 PM (₹59 fee).
            </Notice>
          )}
          {product === 'MTF' && isBuy && (
            <Notice>
              <strong>MTF 5.00x</strong>: Pay <strong>20% ({inr(value / MTF_LEVERAGE)})</strong> margin now; broker funds <strong>80% ({inr(value - value / MTF_LEVERAGE)})</strong> so you can carry delivery holdings past today.
            </Notice>
          )}
          {isExit && position && (
            <Notice>
              Netting against your open <strong>{position.action} ({position.quantity} qty)</strong> position. Margin + P&L will be settled to your balance.
            </Notice>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#EB5B3C] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <OrderSubmitFooter {...ticket} />
    </form>
  );
};
