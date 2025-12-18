// src/lib/baserow/trucks.ts
import { getTableRows } from './client';
import { normalizeField } from './utils';

export const TRUCKS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_TRUCKS_TABLE_ID
);

if (!TRUCKS_TABLE_ID || Number.isNaN(TRUCKS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_TRUCKS_TABLE_ID is not a valid number in .env'
  );
}

type TruckRaw = {
  id: number;
  Patente?: unknown;
};

export type TruckDto = {
  id: number;
  plate: string;
};

function mapTruckRawToDto(row: TruckRaw): TruckDto {
  const plate = normalizeField(row.Patente) || `Camión #${row.id}`;

  return {
    id: row.id,
    plate,
  };
}

export async function getTrucksDto(): Promise<TruckDto[]> {
  const rows = await getTableRows<TruckRaw>(TRUCKS_TABLE_ID);
  return rows
    .map(mapTruckRawToDto)
    .sort((a, b) => a.plate.localeCompare(b.plate));
}
