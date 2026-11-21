import { useMemo } from 'react';
import {
  Holding,
  IntradayPosition,
  Order,
  PortfolioSummary,
  Stock,
} from '../../../types/market';
import { summarizePortfolio } from '../../../utils/portfolio';

export function usePortfolioSummary(
  holdings: Holding[],
  intradayPositions: IntradayPosition[],
  orders: Order[],
  stocks: Stock[],
  balance: number,
  _initialBalance: number
) {
  const portfolioSummary = useMemo<PortfolioSummary>(() => {
    const core = summarizePortfolio(balance, holdings, intradayPositions, orders, stocks);
    let dayHoldingsPnL = 0;

    holdings.forEach((h) => {
      const stock = stocks.find((s) => s.symbol === h.symbol && s.exchange === h.exchange);
      const ltp =
        stock && Number.isFinite(stock.price) && stock.price > 0 ? stock.price : h.averagePrice;
      const prevClose =
        stock && Number.isFinite(stock.previousClose) && stock.previousClose > 0
          ? stock.previousClose
          : h.averagePrice;
      dayHoldingsPnL += (ltp - prevClose) * h.quantity;
    });

    const mtfMargin = holdings.reduce((sum, h) => sum + (h.mtfMarginBlocked ?? 0), 0);
    const lockedMargin = core.margin + mtfMargin + core.reserved;

    const totalPnL = core.unrealized;
    const deployedCapital = core.invested + core.margin;
    const totalPnLPercent = deployedCapital > 0 ? (totalPnL / deployedCapital) * 100 : 0;
    const dayPnL = dayHoldingsPnL + core.positionPnl;
    const dayPnLPercent =
      core.invested + lockedMargin > 0 ? (dayPnL / (core.invested + lockedMargin)) * 100 : 0;

    return {
      currentValue: Number(core.holdingsValue.toFixed(2)),
      totalInvested: Number(core.invested.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent: Number(totalPnLPercent.toFixed(2)),
      dayPnL: Number(dayPnL.toFixed(2)),
      dayPnLPercent: Number(dayPnLPercent.toFixed(2)),
      availableCash: Number(balance.toFixed(2)),
      lockedMargin: Number(lockedMargin.toFixed(2)),
    };
  }, [holdings, intradayPositions, orders, stocks, balance]);

  return portfolioSummary;
}
