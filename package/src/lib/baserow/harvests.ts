// src/lib/baserow/harvests.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  normalizeField,
  toNumber,
} from './utils';

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
  ID?: unknown; // formula field returned as array
  Fecha?: string | null; // ISO date string
  'KG Cosechados'?: number | string | null;
  Lotes?: unknown; // link_row
  'Ciclo de siembra'?: unknown; // link_row to cycles
  Campo?: unknown;
  'Campo texto'?: unknown;
  Cultivo?: unknown;
  Stock?: unknown; // link_row to stock
  'Viajes camión directos'?: unknown; // link_row to trips
  'Total kgs en camión directo'?: number | string | null;
  'Viajes camion desde stock'?: unknown; // lookup desde stock
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
  cycleLabels: string[];
  stockIds: number[];
  directTruckTripIds: number[];
  directTruckKgs: number;
  stockTruckTripIds: number[];
  notes?: string;
}

function mapHarvestRawToDto(row: HarvestRaw): HarvestDto {
  const cycleRaw = row['Ciclo de siembra'];
  const cycleIds = extractLinkRowIds(cycleRaw);
  const cycleLabels = extractLinkRowLabels(cycleRaw);
  const lotsIds = extractLinkRowIds(row.Lotes);
  const stockIds = extractLinkRowIds(row.Stock);
  const directTruckTripIds = extractLinkRowIds(row['Viajes camión directos']);
  const stockTruckTripIds = extractLinkRowIds(
    (row as any)['Viajes camion desde stock']
  );

  const normalizedHarvestId = normalizeField(row.ID);
  const fieldFromText = normalizeField(row['Campo texto']);
  const fieldFromLink = normalizeField(row.Campo);
  const cropLabel = normalizeField(row.Cultivo);

  return {
    id: row.id,
    harvestId: normalizedHarvestId || String(row.id),
    date: row.Fecha ?? null,
    field: fieldFromText || fieldFromLink,
    crop: cropLabel,
    harvestedKgs: toNumber(row['KG Cosechados']),
    lotsIds,
    cycleIds,
    cycleLabels,
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
