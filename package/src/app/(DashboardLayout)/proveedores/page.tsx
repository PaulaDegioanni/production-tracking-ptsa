// src/app/(DashboardLayout)/proveedores/page.tsx
import { getProvidersDto } from '@/lib/baserow/providers';
import { getProviderSelectOptions } from '@/lib/baserow/providerFormOptions';
import ProveedoresPageClient from './ProveedoresPageClient';

const ProveedoresPage = async () => {
  const [providers, selectOptions] = await Promise.all([
    getProvidersDto(),
    getProviderSelectOptions(),
  ]);

  return (
    <ProveedoresPageClient
      initialProviders={providers}
      admitsOptions={selectOptions.admits}
    />
  );
};

export default ProveedoresPage;
