// src/app/(DashboardLayout)/camiones/page.tsx
import { getTrucksDto } from '@/lib/baserow/trucks';
import { getTruckSelectOptions } from '@/lib/baserow/truckFormOptions';
import CamionesPageClient from './CamionesPageClient';

const CamionesPage = async () => {
  const [trucks, selectOptions] = await Promise.all([
    getTrucksDto(),
    getTruckSelectOptions(),
  ]);

  return (
    <CamionesPageClient
      initialTrucks={trucks}
      typeOptions={selectOptions.types}
    />
  );
};

export default CamionesPage;
