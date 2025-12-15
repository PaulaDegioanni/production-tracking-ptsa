// src/lib/baserow/harvests.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  extractLinkRowLabelsTrimmed,
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
  'Kgs Ingresados a Stock'?: number | string | null;
  Lotes?: unknown; // link_row
  'Ciclo de siembra'?: unknown; // link_row to cycles
  Periodo?: unknown;
  Campo?: unknown;
  'Campo texto'?: unknown;
  Cultivo?: unknown;
  Stock?: unknown; // link_row to stock
  'Viajes camión directos'?: unknown; // link_row to trips
  'Kgs Egresados Camión Directo'?: number | string | null;
  Notas?: string | null;
};

export interface HarvestDto {
  id: number;
  harvestId: string;
  date: string | null;
  field: string;
  crop: string;
  harvestedKgs: number;
  lotsIds: number[];
  lotsLabels: string[];
  cycleId: number | null;
  cycleLabel: string | null;
  period: string | null;
  stockIds: number[];
  stockLabels: string[];
  stockKgs: number;
  directTruckTripIds: number[];
  directTruckLabels: string[];
  directTruckKgs: number;
  notes?: string;
}

function mapHarvestRawToDto(row: HarvestRaw): HarvestDto {
  const cycleRaw = row['Ciclo de siembra'];
  const cycleIds = extractLinkRowIds(cycleRaw);
  const cycleLabels = extractLinkRowLabels(cycleRaw);
  const lotsIds = extractLinkRowIds(row.Lotes);
  const lotsLabels = extractLinkRowLabelsTrimmed(row.Lotes);
  const stockIds = extractLinkRowIds(row.Stock);
  const stockLabels = extractLinkRowLabelsTrimmed(row.Stock);
  const directTruckTripIds = extractLinkRowIds(row['Viajes camión directos']);
  const directTruckLabels = extractLinkRowLabelsTrimmed(
    row['Viajes camión directos']
  );
  const normalizedHarvestId = normalizeField(row.ID);
  const fieldFromText = normalizeField(row['Campo texto']);
  const fieldFromLink = normalizeField(row.Campo);
  const cropLabel = normalizeField(row.Cultivo);

  const cycleId = cycleIds[0] ?? null;
  const cycleLabel = cycleLabels[0] ?? null;
  const period = normalizeField((row as any).Periodo) || null;

  return {
    id: row.id,
    harvestId: normalizedHarvestId || String(row.id),
    date: row.Fecha ?? null,
    field: fieldFromText || fieldFromLink,
    crop: cropLabel,
    harvestedKgs: toNumber(row['KG Cosechados']),
    lotsIds,
    lotsLabels,
    cycleId: cycleId,
    cycleLabel: cycleLabel,
    period,
    stockIds,
    stockLabels,
    stockKgs: toNumber(row['Kgs Ingresados a Stock']),
    directTruckTripIds,
    directTruckLabels,
    directTruckKgs: toNumber(row['Kgs Egresados Camión Directo']),
    notes: row.Notas ?? undefined,
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
    .filter((h) => h.cycleId.includes(cycleId));
}
