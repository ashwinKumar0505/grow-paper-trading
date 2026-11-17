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
 const isIndex = stock.sector === 'Index';
 
 return (
    <div className="animate-fade-in pb-24">
      {/* Breadcrumb bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => { setCurrentTab('explore'); navigate('/trade'); }}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isIndex ? 'Indices' : 'Stocks'}</span>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">{stock.name}</span>
        </button>
      </div>

      {/* Groww 2-Column Desktop Layout: Left (Header + Chart + Details) | Right (Sticky Order Pad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN */}
        <div className={`${isIndex ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6 min-w-0`}>
          <StockQuoteCard {...model} />
          {!isIndex && <StockPositionBanner {...model} />}

          <StockPerformance {...model} />
          {!isIndex && <StockDepth {...model} />}
          {!isIndex && <StockFundamentals {...model} />}
        </div>

        {/* RIGHT COLUMN: Sticky Groww Order Pad (Desktop) */}
        {!isIndex && (
          <div className="hidden lg:block lg:col-span-4 sticky top-20">
            <OrderPanel stock={stock} />
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Buy / Sell Action Bar (< lg) */}
      {!isIndex && (
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
      )}
    </div>
  );

};
