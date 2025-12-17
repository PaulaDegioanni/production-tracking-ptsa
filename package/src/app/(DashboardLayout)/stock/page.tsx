// src/app/(DashboardLayout)/stock/page.tsx
import { getStockDto } from '@/lib/baserow/stocks';
import { getStockSelectOptions } from '@/lib/baserow/stockFormOptions';
import StockPageClient from './StockPageClient';

const StockPage = async () => {
  const [stockUnits, selectOptions] = await Promise.all([
    getStockDto(),
    getStockSelectOptions(),
  ]);

  return (
    <StockPageClient
      initialStock={stockUnits}
      unitTypeOptions={selectOptions.unitTypes}
      statusOptions={selectOptions.statuses}
    />
  );
};

export default StockPage;
