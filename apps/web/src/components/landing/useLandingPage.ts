import { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { INITIAL_STOCKS } from '../../data/mockStocks';
import { buildTradeStockPath, navigate } from '../../lib/navigation';
import { type PaidBillingCycle } from '../../utils/pricing';
export function useLandingPage() {

  const {
    user,
    setShowLandingPage,
    setSelectedStock,
    selectStockBySymbol,
    stocks,
    setCurrentTab,
    openAuthModal,
    subscriptionTier,
  } = useTrading();

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<PaidBillingCycle>('yearly');

  const handleGetStarted = () => {
    if (user) {
      setShowLandingPage(false);
      setCurrentTab('explore');
      navigate('/trade');
    } else {
      openAuthModal('signup');
    }
  };

  const handleLaunchTradeStock = (sym: string) => {
    const target = stocks.find((s) => s.symbol === sym);
    if (target) {
      setSelectedStock(target);
      setCurrentTab('stock-detail');
    } else {
      selectStockBySymbol(sym);
    }
    navigate(buildTradeStockPath(sym));
  };

  const tickerList = stocks && stocks.length > 0 ? stocks : INITIAL_STOCKS;

  const faqs = [
    {
      q: 'What are the 3 tools included inside Tradedia?',
      a: 'Tradedia brings together three connected tools in one place: (1) Paper Trading Desk to practice Delivery and 5x Intraday orders with ₹1,00,000 to ₹50,00,000 in virtual capital, (2) Stock Screener AI Powered & Stock Analysis to find Swing and Intraday technical setups across Nifty 500 using chart analysis, backtested strategies, and AI-powered insights, and (3) Interactive Learning & Guess the Chart to master 21 candlestick patterns and step through synthetic educational chart scenarios.',
    },
    {
      q: 'How does the Stock Screener evaluate stocks?',
      a: 'Our screener combines technical chart analysis, historically backtested strategies, and rule-based quantitative insights across Nifty 500 stocks. It evaluates BUY, WAIT, and AVOID signals alongside confidence scores (0–100), reference entry zones, targets, stop-loss levels, and historical strategy statistics for both Swing and 15-minute Intraday trading.',
    },
    {
      q: 'What do I see when I search a stock in Stock Analysis?',
      a: 'Type any Nifty 500 stock (like Reliance, TCS, or HDFC Bank) to see a confidence-based verdict (BUY, WAIT, or AVOID), chart structure with support/resistance levels, company revenue & profit, 2-year historical strategy backtests (with full advanced indicator & risk diagnostics on Advanced), and a rule-based technical commentary layer.',
    },
    {
      q: 'How does the Paper Trading Desk work?',
      a: 'Practice risk-free with ₹1,00,000 (scalable up to ₹50,00,000) in virtual capital. Place Delivery (CNC) or 5x leveraged Intraday (MIS) Market and Limit orders on NSE stock prices, see realistic brokerage and statutory tax breakdowns, and track your portfolio performance without risking real money.',
    },
    {
      q: 'How do the Chart Pattern Library and Guess the Chart Quiz help traders?',
      a: 'The Interactive Learning module breaks down 21 classic candlestick and chart patterns with plain-English explanations, why the pattern works, and exact entry, stop-loss, and target rules — plus interactive synthetic chart demonstrations and the Guess the Chart quiz to test your analysis skills.',
    },
    {
      q: 'Is any real money or SEBI brokerage account involved?',
      a: 'No. Tradedia is strictly for educational learning, screening research, and risk-free paper trading simulation. All trades use virtual cash, historical backtests or technical insights never guarantee future profits, and nothing on the platform is investment advice.',
    },
  ];

  
return { user, stocks, openAuthModal, openFaqIndex, setOpenFaqIndex, billingCycle, setBillingCycle, handleGetStarted, handleLaunchTradeStock, tickerList, faqs };
}
export type LandingModel = ReturnType<typeof useLandingPage>;
