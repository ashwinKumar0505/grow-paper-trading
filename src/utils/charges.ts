/** Estimated equity charges, checked against https://groww.in/pricing on 2026-11-11.
 * Standard ₹3.50 depository fee; BSE standard equity group rate.
 * These are paper estimates, not a broker contract note or settlement ledger.
 */
import { Exchange, OrderAction, OrderProduct } from '../types/market';

export const AUTO_SQUARE_OFF_CHARGE = 59; // ₹50 + 18% GST, per position

export interface ChargeBreakdown {
  brokerage: number;
  stt: number;
  exchangeTxn: number;
  sebi: number;
  ipft: number;
  stampDuty: number;
  gst: number;
  dp: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateCharges(params: {
  product: OrderProduct;
  action: OrderAction;
  quantity: number;
  price: number;
  exchange?: Exchange;
}): ChargeBreakdown {
  const { product, action, quantity, price, exchange = 'NSE' } = params;
  const turnover = Math.max(0, quantity * price);

  if (!Number.isFinite(turnover) || turnover <= 0) {
    return { brokerage: 0, stt: 0, exchangeTxn: 0, sebi: 0, ipft: 0, stampDuty: 0, gst: 0, dp: 0, total: 0 };
  }

  const isDelivery = product === 'DELIVERY';
  const isBuy = action === 'BUY';

  const brokerage = Math.min(turnover * 0.025, Math.max(5, Math.min(20, turnover * 0.001)));
  const stt = isDelivery ? Math.round(turnover * 0.001) : !isBuy ? Math.round(turnover * 0.00025) : 0;
  const exchangeTxn = turnover * (exchange === 'BSE' ? 0.0000375 : 0.0000307);
  const sebi = turnover * 0.000001;
  const stampDuty = isBuy ? Math.round(turnover * (isDelivery ? 0.00015 : 0.00003)) : 0;
  const ipft = exchange === 'NSE' ? turnover * 0.000001 : 0;
  const gst = 0.18 * (brokerage + exchangeTxn + sebi + ipft);
  const dp = isDelivery && !isBuy ? (3.5 + (turnover < 100 ? 0 : 16.5)) * 1.18 : 0;

  const total = [brokerage, stt, exchangeTxn, sebi, ipft, stampDuty, gst, dp].reduce((sum, fee) => sum + round2(fee), 0);

  return {
    brokerage: round2(brokerage),
    stt: round2(stt),
    exchangeTxn: round2(exchangeTxn),
    sebi: round2(sebi),
    ipft: round2(ipft),
    stampDuty: round2(stampDuty),
    gst: round2(gst),
    dp: round2(dp),
    total: round2(total),
  };
}
