// src/app/(DashboardLayout)/stock/page.tsx
import { getStockDto } from '@/lib/baserow/stock';
import StockPageClient from './StockPageClient';

const StockPage = async () => {
  const stockUnits = await getStockDto();
  return <StockPageClient initialStock={stockUnits} />;
};

export default StockPage;
