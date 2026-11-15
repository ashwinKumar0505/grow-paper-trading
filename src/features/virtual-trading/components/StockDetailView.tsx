import {
ArrowLeft,
Calendar,
ChevronRight
} from 'lucide-react';
import React from 'react';
import { navigate } from '../../../lib/navigation';
import { useStockDetails } from '../hooks/useStockDetails';
import { OrderPanel } from './OrderPanel';
import { StockDepth } from './StockDepth';
import { StockFundamentals } from './StockFundamentals';
import { StockPerformance } from './StockPerformance';
import { StockPositionBanner } from './StockPositionBanner';
import { StockQuoteCard } from './StockQuoteCard';

export const StockDetailView: React.FC = () => {
 const model = useStockDetails();
 const { setCurrentTab, openOrderModal, marketStatus, stock } = model;
 
 return (
    <div className="animate-fade-in pb-24">
      {/* Breadcrumb bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => { setCurrentTab('explore'); navigate('/trade'); }}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Stocks</span>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">{stock.name}</span>
        </button>
      </div>

      {/* Groww 2-Column Desktop Layout: Left (Header + Chart + Details) | Right (Sticky Order Pad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
<StockQuoteCard {...model} />
<StockPositionBanner {...model} />
          {/* 3. Groww "Create Stock SIP" Card (Matches the card below the chart in the screenshot) */}
          <div
            onClick={() => openOrderModal(stock, 'BUY', 'DELIVERY', 1)}
            className="bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-[#282C37] px-5 py-4 shadow-xs flex items-center justify-between gap-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#232732] flex items-center justify-center text-gray-600 dark:text-gray-300">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  Create Stock SIP
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Automate your investments in this Stock
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

<StockPerformance {...model} />
<StockDepth {...model} />
<StockFundamentals {...model} />
        </div>

        {/* RIGHT COLUMN: Sticky Groww Order Pad (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <OrderPanel stock={stock} />
        </div>
      </div>

      {/* Mobile Sticky Bottom Buy / Sell Action Bar (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1A1D24] border-t border-gray-200 dark:border-[#282C37] p-3 flex items-center gap-3 shadow-lg">
        <button
          onClick={() => openOrderModal(stock, 'SELL')}
          className="flex-1 h-11 bg-[#EB5B3C] hover:opacity-95 text-white font-semibold text-sm rounded-lg cursor-pointer"
        >
          {marketStatus.isOpen ? 'Sell' : 'Schedule Sell'}
        </button>
        <button
          onClick={() => openOrderModal(stock, 'BUY')}
          className="flex-1 h-11 bg-[#00B386] hover:opacity-95 text-white font-semibold text-sm rounded-lg cursor-pointer"
        >
          {marketStatus.isOpen ? 'Buy' : 'Schedule Buy'}
        </button>
      </div>
    </div>
  );

};
