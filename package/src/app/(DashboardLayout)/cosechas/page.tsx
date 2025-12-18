import { getHarvestsDto } from '@/lib/baserow/harvests';
import { getStockSelectOptions } from '@/lib/baserow/stockFormOptions';
import CosechasPageClient from './CosechasPageClient';

const CosechasPage = async () => {
  const [harvests, stockOptions] = await Promise.all([
    getHarvestsDto(),
    getStockSelectOptions(),
  ]);

  return (
    <CosechasPageClient
      initialHarvests={harvests}
      stockUnitTypeOptions={stockOptions.unitTypes}
      stockStatusOptions={stockOptions.statuses}
    />
  );
};

export default CosechasPage;
