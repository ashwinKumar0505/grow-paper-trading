import React from 'react';
import { useStockExplorer } from '../hooks/useStockExplorer';
import { MarketMovers } from './MarketMovers';
import { StockExplorerTable } from './StockExplorerTable';
import { TrendingStocks } from './TrendingStocks';

export const ExploreView: React.FC = () => {
 const model = useStockExplorer();
 const {  } = model;
 
 return (
    <div className="space-y-8 animate-fade-in pb-12">
<TrendingStocks {...model} />
<MarketMovers {...model} />
<StockExplorerTable {...model} />
    </div>
  );

};
