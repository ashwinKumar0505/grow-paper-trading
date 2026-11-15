import { useMemo } from 'react';
import {
Holding,
IntradayPosition,
Order,
PortfolioSummary,
Stock
} from '../../../types/market';




export function usePortfolioSummary(holdings: Holding[], intradayPositions: IntradayPosition[], orders: Order[], stocks: Stock[], balance: number, initialBalance: number) {
  // Portfolio Summary Calculation (Real-time!)
  const portfolioSummary = useMemo<PortfolioSummary>(() => {
    let currentHoldingsValue = 0;
    let totalInvested = 0;
    let dayHoldingsPnL = 0;

    // Delivery Holdings
    holdings.forEach((h) => {
      const stock = stocks.find((s) => s.symbol === h.symbol);
      const ltp = stock ? stock.price : h.averagePrice;
      const prevClose = stock ? stock.previousClose : h.averagePrice;

      const curVal = ltp * h.quantity;
      currentHoldingsValue += curVal;
      totalInvested += h.totalInvested;

      // 1D return on this holding
      const dayChg = (ltp - prevClose) * h.quantity;
      dayHoldingsPnL += dayChg;
    });

    // Intraday Positions unrealized P&L & locked margin (incl. MTF 5x delivery margin & open order reservations)
    let intradayPnL = 0;
    let lockedMargin = 0;

    holdings.forEach((h) => {
      if (h.mtfMarginBlocked && h.mtfMarginBlocked > 0) {
        lockedMargin += h.mtfMarginBlocked;
      }
    });

    intradayPositions.forEach((pos) => {
      const stock = stocks.find((s) => s.symbol === pos.symbol);
      const ltp = stock ? stock.price : pos.entryPrice;
      lockedMargin += pos.marginBlocked;

      const posPnL = pos.action === 'BUY'
        ? (ltp - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - ltp) * pos.quantity;

      intradayPnL += posPnL;
    });

    orders.forEach((o) => {
      if ((o.status === 'PENDING' || o.status === 'SCHEDULED') && o.blockedAmount) {
        lockedMargin += o.blockedAmount;
      }
    });

    const totalPnL = (currentHoldingsValue - totalInvested) + intradayPnL;
    const capital = totalInvested + intradayPositions.reduce((sum, p) => sum + p.marginBlocked, 0);
    const totalPnLPercent = capital > 0 ? (totalPnL / capital) * 100 : 0;
    const dayPnL = dayHoldingsPnL + intradayPnL;
    const dayPnLPercent = totalInvested > 0 ? (dayPnL / (totalInvested + lockedMargin)) * 100 : 0;

    return {
      currentValue: Number(currentHoldingsValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent: Number(totalPnLPercent.toFixed(2)),
      dayPnL: Number(dayPnL.toFixed(2)),
      dayPnLPercent: Number(dayPnLPercent.toFixed(2)),
      availableCash: Number(balance.toFixed(2)),
      lockedMargin: Number(lockedMargin.toFixed(2)),
    };
  }, [holdings, intradayPositions, stocks, balance, orders]);

  return portfolioSummary;
}
