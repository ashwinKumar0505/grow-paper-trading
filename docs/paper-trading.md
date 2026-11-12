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

## TradePlaybook learning and trading routes

The application combines the existing paper trading desk with the chart-pattern learning components migrated from `trade-pulse-quiz`.

| Route | Experience |
| --- | --- |
| `/` | Shared TradePlaybook landing page |
| `/trade` | Paper trading desk; signed-out visitors can create an account or sign in |
| `/markets` | Stock exploration using the existing paper account |
| `/quiz` | Public quiz mode and difficulty selection |
| `/quiz/play` | Interactive chart prediction and answer explanations |
| `/pattern-library` | Searchable pattern library with generated chart examples |

The header and landing page link the two experiences. URL navigation supports refresh, deep links, and browser back/forward through the existing Express SPA fallback. The trading provider remains mounted across route changes to retain portfolio state. The quiz is lazy-loaded from `src/features/quiz`; its components, generator, indicator helpers, sound utility, types, and referenced cheat-sheet image are local to this repository. No source-app package, configuration, or server files were imported, and no dependencies were added.

Practice accuracy, quiz history, preferences, and survival best streak are stored in the browser using the original `tradepulse_*` keys. Paper trading keeps its existing storage keys. Records from another origin are not transferred automatically. Quiz cash is separate from the paper wallet. A new launch or refresh starts a new run; completed answers stay in history, and leaving an in-progress reveal cancels it without recording an answer.

The quiz supports unlimited practice, three-life survival, and a ten-round virtual-cash challenge. The library stacks its pattern picker above the chart on small screens. Charts initially fit the entire example, with zoom and pan available for inspection.

Validation: `npm test` covers the trading engine and generated chart OHLC bounds for every pattern/asset pair; `npx tsc --noEmit` checks types and `npm run build` produces both app bundles.

### Shared navigation layouts

`MarketingHeader` is used only on `/`. `WorkspaceHeader` owns navigation across `/trade`, `/quiz` (including `/quiz/play`), `/pattern-library`, and `/markets`. Both compose `HeaderFrame` and `BrandLogo`, with identical `h-16` brand rows and `px-4 sm:px-6` gutters. Below desktop width, mode links occupy a scrollable second row and keep the active mode in view.

`TradingToolbar` retains account, search, wallet, and portfolio controls below the workspace header. `QuizToolbar` and the pattern-library toolbar contain activity controls only. Quiz sound lives exclusively in the workspace utilities on quiz routes and uses the sound service's saved state; theme uses the existing trading preference throughout. Learning page surfaces follow the shared light/dark theme while the chart canvas retains its terminal palette.

Legacy `/paper-trading` and `/quiz/learn` URLs are normalized to `/trade` and `/pattern-library` with `replaceState`, retaining search parameters and hash fragments without adding a browser-history entry.
