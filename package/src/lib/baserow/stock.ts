// src/lib/baserow/stock.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  extractLinkRowLabelsTrimmed,
  toNumber,
  normalizeField,
} from './utils';

const STOCK_TABLE_ID = Number(process.env.NEXT_PUBLIC_BASEROW_STOCK_TABLE_ID);

if (!STOCK_TABLE_ID || Number.isNaN(STOCK_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_STOCK_TABLE_ID is not a valid number in .env'
  );
}

// Raw shape from Baserow
export type StockRaw = {
  id: number;
  ID?: string; // formula
  Notas?: string | null;
  'Ciclo de siembra'?: any; // link_row to cycles
  'Tipo unidad'?: any;
  'Fecha de creación'?: string | null;
  'Cosechas Origen'?: unknown; // link_row to harvests
  'Kgs Ingresados a Stock'?: number | string | null;
  'Total kgs ingresados'?: number | string | null;
  'Viajes de camión desde stock'?: any; // link_row to trips
  'Kgs egresados'?: number | string | null;
  'Total kgs egresados cosecha'?: number | string | null;
  'Kgs actuales'?: number | string | null;
  Estado?: any; // option / lookup
  Campo?: any; // option / lookup
  Cultivo?: any; // option / lookup
};

export type StockStatus = 'Nuevo' | 'Vacío' | 'Parcial' | 'Completo' | string;

export interface StockDto {
  id: number;
  name: string;
  notes?: string;
  cycleIds: number[];
  cycleLabels: string[];
  unitType: string;
  createdAt: string | null;
  originHarvestIds: number[];
  originHarvestsLabels: string[];
  harvestedKgs: number;
  totalInKgs: number;
  truckTripIds: number[];
  truckTripLabels: string[];
  totalOutFromHarvestKgs: number;
  currentKgs: number;
  status: StockStatus | null;
  field: string;
  crop: string;
}

function mapStockRawToDto(row: StockRaw): StockDto {
  const cycleIds = extractLinkRowIds(row['Ciclo de siembra']);
  const cycleLabels = extractLinkRowLabels(row['Ciclo de siembra']);
  const originHarvestIds = extractLinkRowIds(row['Cosechas Origen']);
  const originHarvestsLabels = extractLinkRowLabelsTrimmed(
    row['Cosechas Origen']
  );
  const truckTripIds = extractLinkRowIds(
    row['Viajes de camión desde stock'] as unknown
  );
  const truckTripLabels = extractLinkRowLabelsTrimmed(
    row['Viajes de camión desde stock'] as unknown
  );

  return {
    id: row.id,
    name: normalizeField(row.ID),
    notes: row.Notas ?? undefined,
    cycleIds,
    cycleLabels,
    unitType: normalizeField(row['Tipo unidad']),
    createdAt: row['Fecha de creación'] ?? null,
    originHarvestIds,
    originHarvestsLabels,
    harvestedKgs: toNumber(row['Kgs Ingresados a Stock']),
    totalInKgs: toNumber(row['Total kgs ingresados']),
    truckTripIds,
    truckTripLabels,
    totalOutFromHarvestKgs: toNumber(row['Total kgs egresados cosecha']),
    currentKgs: toNumber(row['Kgs actuales']),
    status: (normalizeField(row.Estado) as StockStatus) ?? null,
    field: normalizeField(row.Campo),
    crop: normalizeField(row.Cultivo),
  };
}

// Public API

export async function getStockRaw(): Promise<StockRaw[]> {
  return getTableRows<StockRaw>(STOCK_TABLE_ID);
}

export async function getStockDto(): Promise<StockDto[]> {
  const rows = await getStockRaw();
  return rows.map(mapStockRawToDto);
}

export async function getStockByCycleIdDto(
  cycleId: number
): Promise<StockDto[]> {
  const rows = await getStockRaw();
  return rows.map(mapStockRawToDto).filter((s) => s.cycleIds.includes(cycleId));
}
