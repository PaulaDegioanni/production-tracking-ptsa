// src/lib/baserow/harvests.ts
import { getTableRows } from './client';
import { extractLinkRowIds, toNumber, toStringOrEmpty } from './utils';

const HARVESTS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_HARVESTS_TABLE_ID
);

if (!HARVESTS_TABLE_ID || Number.isNaN(HARVESTS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_HARVESTS_TABLE_ID is not a valid number in .env'
  );
}

// Raw shape from Baserow (only fields we care about)
export type HarvestRaw = {
  id: number;
  ID?: string; // formula ID
  Fecha?: string; // ISO date string
  'KG Cosechados'?: number | string | null;
  Lotes?: unknown; // link_row
  'Ciclo de siembra'?: unknown; // link_row to cycles
  Campo?: string | null;
  Cultivo?: string | null;
  Stock?: unknown; // link_row to stock
  'Viajes camión directos'?: unknown; // link_row to trips
  'Total kgs en camión directo'?: number | string | null;
  'Viajes camion desde stock'?: unknown; // lookup from stock
  Observaciones?: string | null;
};

export interface HarvestDto {
  id: number;
  harvestId: string;
  date: string | null;
  field: string;
  crop: string;
  harvestedKgs: number;
  lotsIds: number[];
  cycleIds: number[];
  stockIds: number[];
  directTruckTripIds: number[];
  directTruckKgs: number;
  stockTruckTripIds: number[];
  notes?: string;
}

function mapHarvestRawToDto(row: HarvestRaw): HarvestDto {
  const cycleIds = extractLinkRowIds(row['Ciclo de siembra']);
  const lotsIds = extractLinkRowIds(row.Lotes);
  const stockIds = extractLinkRowIds(row.Stock);
  const directTruckTripIds = extractLinkRowIds(row['Viajes camión directos']);
  const stockTruckTripIds = extractLinkRowIds(
    (row as any)['Viajes camion desde stock']
  );

  return {
    id: row.id,
    harvestId: toStringOrEmpty(row.ID),
    date: row.Fecha ?? null,
    field: toStringOrEmpty(row.Campo),
    crop: toStringOrEmpty(row.Cultivo),
    harvestedKgs: toNumber(row['KG Cosechados']),
    lotsIds,
    cycleIds,
    stockIds,
    directTruckTripIds,
    directTruckKgs: toNumber(row['Total kgs en camión directo']),
    stockTruckTripIds,
    notes: row.Observaciones ?? undefined,
  };
}

// Public API

export async function getHarvestsRaw(): Promise<HarvestRaw[]> {
  return getTableRows<HarvestRaw>(HARVESTS_TABLE_ID);
}

export async function getHarvestsDto(): Promise<HarvestDto[]> {
  const rows = await getHarvestsRaw();
  return rows.map(mapHarvestRawToDto);
}

export async function getHarvestsByCycleIdDto(
  cycleId: number
): Promise<HarvestDto[]> {
  const rows = await getHarvestsRaw();
  return rows
    .map(mapHarvestRawToDto)
    .filter((h) => h.cycleIds.includes(cycleId));
}
