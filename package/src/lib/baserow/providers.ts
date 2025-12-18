// src/lib/baserow/providers.ts
import { getTableRows } from './client';
import { normalizeField } from './utils';

export const PROVIDERS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID
);

if (!PROVIDERS_TABLE_ID || Number.isNaN(PROVIDERS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID is not a valid number in .env'
  );
}

type ProviderRaw = {
  id: number;
  Name?: unknown;
  Nombre?: unknown;
};

export type ProviderDto = {
  id: number;
  name: string;
};

function mapProviderRawToDto(row: ProviderRaw): ProviderDto {
  const label =
    normalizeField(row.Name) ||
    normalizeField(row.Nombre) ||
    `Proveedor #${row.id}`;

  return {
    id: row.id,
    name: label,
  };
}

export async function getProvidersDto(): Promise<ProviderDto[]> {
  const rows = await getTableRows<ProviderRaw>(PROVIDERS_TABLE_ID);
  return rows
    .map(mapProviderRawToDto)
    .sort((a, b) => a.name.localeCompare(b.name));
}
