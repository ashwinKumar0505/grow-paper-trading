# Paper trading accounting

- Average price is quantity-weighted, excludes charges, and retains full precision internally. Display rounding is two decimal places. Selling part of a delivery holding removes proportional cost; adding to a long or short position recalculates its weighted average.
- Intraday margin uses a fixed 5× simulation model. Opposite trades close existing quantity first, release proportional margin, realize signed price movement, and open any excess in the opposite direction. A losing exit is permitted even if cash becomes negative; a reversal requires sufficient margin.
- Account value = available cash + holdings market value + position margin + pending-order reservations + intraday unrealized P&L.
- Net P&L = realized price P&L + unrealized price P&L − all executed-order charges. Pending, rejected, and cancelled orders incur no execution charges. Historical orders without gross P&L use their recorded net P&L plus exit charges.
- Quotes are restricted to the available exchange. Missing quotes show “Unavailable”; account estimates use cost until a quote is available. Older fills and historical rounding are not rewritten.
- Limit and stop orders use the same fill engine as market orders. Reservations are released before execution or rejection. Expired day orders are cancelled before matching after reconnecting.

## Estimated charges

Checked on 2026-11-11 against https://groww.in/pricing and https://groww.in/help/stocks/searchable/when-are-dp-charges-levied. Brokerage also follows the small-order cap described at https://groww.in/help/stocks%2C-f%26o-%26-ipo/searchable/how-much-is-the-brokerage.

NSE transaction charge: 0.00307%; IPFT: 0.0001%. Delivery sell DP estimate uses ₹3.50 depository fee plus ₹16.50 platform fee (platform fee waived for debit value below ₹100), plus GST. The model uses the standard depository fee and standard BSE equity rate; it does not model account-specific discounts or BSE security-group exceptions. Rounded fee components sum to the displayed total.

## Verification and limits

Run `npm test`, `npx tsc --noEmit`, and `npm run build`.

This is a paper simulator, not an exchange or settlement system. Quote-based fills do not model bid/ask slippage, market impact, partial fills, or queue priority. The existing fixed circuit-band and leverage rules are approximations. Delivery settlement dates, corporate actions, broker-specific margin eligibility, and historical tax-lot reporting are not modeled. Offline square-off cannot reconstruct an actual historical execution price. These limits mean this app cannot promise exact broker contract-note parity.
