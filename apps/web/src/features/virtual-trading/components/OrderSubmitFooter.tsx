import { Lock } from 'lucide-react';
import {
INTRADAY_LEVERAGE,
MTF_LEVERAGE
} from '../../../utils/orderEngine';

import type { OrderTicket } from '../hooks/useOrderTicket';
import { BUY,inr } from '../utils/orderTicket';
import { Row } from './OrderNotices';

type Props = Pick<OrderTicket, 'balance' | 'setIsWalletModalOpen' | 'planConfig' | 'openUpgradeModal' | 'product' | 'exchange' | 'showCharges' | 'setShowCharges' | 'qty' | 'isBuy' | 'accent' | 'effPrice' | 'isExit' | 'charges' | 'value' | 'required' | 'insufficient' | 'intradayBlocked' | 'submit' | 'submitLabel'>;

export function OrderSubmitFooter({ balance, setIsWalletModalOpen, planConfig, openUpgradeModal, product, exchange, showCharges, setShowCharges, qty, isBuy, accent, effPrice, isExit, charges, value, required, insufficient, intradayBlocked, submit, submitLabel }: Props) {
  return <>
      {/* 4. Bottom Footer: Balance, Approx Req & Buy/Sell Button */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-[#2A2E39] space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          <span>
            Balance : <strong className="font-semibold text-gray-700 dark:text-gray-200">{inr(balance, 0)}</strong>
          </span>

          <button
            type="button"
            onClick={() => {
              if (!planConfig.allowDetailedChargesBreakdown) {
                openUpgradeModal({
                  requiredTier: 'beginner',
                  featureName: 'Full Statutory Charges Breakdown',
                  featureDescription:
                    'Inspecting exact Estimated Brokerage, STT, Exchange Txn, SEBI, Stamp Duty, GST & DP charges is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.',
                });
                return;
              }
              setShowCharges((s) => !s);
            }}
            className="cursor-pointer text-right inline-flex items-center gap-1"
            title="Click to view full estimated brokerage & statutory charges breakdown"
          >
            {!planConfig.allowDetailedChargesBreakdown && <Lock className="w-3 h-3 text-amber-500" />}
            <span className="border-b border-dashed border-gray-400">
              {(product === 'DELIVERY' || product === 'MTF') && !isBuy ? 'Est. charges' : 'Approx req.'}
            </span>{' '}
            :{' '}
            <strong className="font-semibold text-gray-700 dark:text-gray-200">
              {(product === 'DELIVERY' || product === 'MTF') && !isBuy ? inr(charges.total, 0) : inr(required, 0)}
            </strong>
          </button>
        </div>

        {/* Expandable Statutory Charges Breakdown */}
        {showCharges && (
          <div className="rounded-lg bg-gray-50 dark:bg-[#20242F] p-3 text-[11px] space-y-1 text-gray-600 dark:text-gray-300 tabular-nums border border-gray-100 dark:border-[#2E3340]">
            <Row label={`Turnover (${qty} × ${inr(effPrice)})`} value={inr(value)} />
            {product === 'INTRADAY' && !isExit && (
              <Row label={`Intraday margin (${INTRADAY_LEVERAGE}x · 20%)`} value={inr(value / INTRADAY_LEVERAGE)} />
            )}
            {product === 'MTF' && isBuy && (
              <>
                <Row label={`Your MTF margin (${MTF_LEVERAGE}.00x · 20%)`} value={inr(value / MTF_LEVERAGE)} />
                <Row label="Funded by broker (80%)" value={inr(value - value / MTF_LEVERAGE)} />
              </>
            )}
            <div className="border-t border-gray-200 dark:border-[#2E3340] my-1" />
            <Row label="Estimated Brokerage" value={inr(charges.brokerage)} />
            <Row label="STT" value={inr(charges.stt)} />
            <Row label={`Exchange txn (${exchange})`} value={inr(charges.exchangeTxn)} />
            <Row label="SEBI turnover fee" value={inr(charges.sebi)} />
            <Row label="IPFT" value={inr(charges.ipft)} />
            <Row label="Stamp duty" value={inr(charges.stampDuty)} />
            <Row label="GST (18%)" value={inr(charges.gst)} />
            {charges.dp > 0 && <Row label="DP charges (incl. GST)" value={inr(charges.dp)} />}
            <div className="border-t border-gray-200 dark:border-[#2E3340] my-1" />
            <Row label="Total charges" value={inr(charges.total)} bold />
          </div>
        )}

        {insufficient && !intradayBlocked ? (
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-95"
            style={{ backgroundColor: BUY }}
          >
            Add money (+{inr(Math.ceil(required - balance), 0)})
          </button>
        ) : (
          <button
            type="submit"
            disabled={intradayBlocked || qty <= 0}
            className="w-full h-11 rounded-lg font-semibold text-sm text-white transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
            style={{ backgroundColor: accent }}
          >
            {submitLabel}
          </button>
        )}
      </div>
  </>;
}
