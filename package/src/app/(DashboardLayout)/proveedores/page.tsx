// src/app/(DashboardLayout)/proveedores/page.tsx
import { getProviderPeriodRowsDto, getProvidersDto } from '@/lib/baserow/providers';
import { getProviderSelectOptions } from '@/lib/baserow/providerFormOptions';
import ProveedoresPageClient from './ProveedoresPageClient';

export const dynamic = 'force-dynamic';

const ProveedoresPage = async () => {
  const [providers, providerRows, selectOptions] = await Promise.all([
    getProvidersDto(),
    getProviderPeriodRowsDto(),
    getProviderSelectOptions(),
  ]);

  return (
    <ProveedoresPageClient
      initialProviders={providers}
      initialProviderRows={providerRows}
      admitsOptions={selectOptions.admits}
    />
  );
};

export default ProveedoresPage;
