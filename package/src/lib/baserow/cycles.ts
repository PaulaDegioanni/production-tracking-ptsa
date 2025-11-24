// src/lib/baserow/ciclos.ts
import { getTableRows, getTableRowById } from './client';
import { toNumber, normalizeField, extractLinkRowIds } from './utils';

const CYCLES_TABLE_ID = Number(process.env.NEXT_PUBLIC_BASEROW_CYCLES_TABLE_ID);

if (!CYCLES_TABLE_ID || Number.isNaN(CYCLES_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_CYCLES_TABLE_ID is not a valid number in .env'
  );
}

// --- RAW: shape as it comes from Baserow ---
export type CycleRaw = {
  id: number;
  ID: string;
  Campo?: string;
  Cultivo?: {
    id: number;
    value: string;
    color: string;
  } | null;
  Estado?: {
    id: number;
    value: string;
    color: string;
  } | null;
  Lotes?: {
    id: number;
    value: string;
    order: string;
  } | null;
  'Superficie (has)'?: number;
  'Rendimiento esperado (qq/ha)'?: number;
  'Rendimiento obtenido (qq/ha)'?: number;
  'Kgs totales'?: number;
  'Kgs en Stock'?: number;
  'Kgs Camión desde Stock'?: number;
  'Kgs Camión desde Cosecha'?: number;
  'Kgs Check'?: number;
  'Año de campaña'?: string;
  'Fecha de siembra'?: string;
  'Fecha estimada de cosecha'?: string;
  'Inicio cosecha'?: string;
  'Fin cosecha'?: string;
  'Duración Cosecha'?: number;
};

// --- DTO: normalized shape used in the UI ---
export type CycleStatus =
  | 'planificado'
  | 'sembrado'
  | 'listo-para-cosechar'
  | 'en-cosecha'
  | 'cosechado';

export interface CycleDto {
  id: number;
  cycleId: string;
  field: string;
  crop: string;
  areaHa: number;
  status: CycleStatus;
  expectedYield: number; // qq/ha
  actualYield: number; // qq/ha
  totalKgs: number;
  stockKgs: number;
  truckKgs: number;
  checkKgs: number;
  year: string;
  sowingDate?: string;
  estimatedHarvestDate?: string;
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  harvestDurationDays?: number | null;
  lotIds: number[];
}

// --- Internal helpers to map raw -> dto ---
function normalizeStatus(option?: CycleRaw['Estado']): CycleStatus {
  const v = (option?.value || '').toLowerCase();

  if (v.includes('planificado')) return 'planificado';
  if (v.includes('sembrado')) return 'sembrado';
  if (v.includes('listo')) return 'listo-para-cosechar';
  if (v.includes('en cosecha')) return 'en-cosecha';
  if (v.includes('cosechado')) return 'cosechado';

  return 'planificado';
}

function mapCycleRow(row: CycleRaw): CycleDto {
  const stockKgs = toNumber(row['Kgs en Stock']);
  const truckFromStock = toNumber(row['Kgs Camión desde Stock']);
  const truckFromHarvest = toNumber(row['Kgs Camión desde Cosecha']);

  return {
    id: row.id,
    cycleId: String(row.ID ?? ''),
    field: normalizeField(row.Campo ?? ''),
    crop: normalizeField(row.Cultivo?.value ?? ''),
    areaHa: toNumber(row['Superficie (has)']),
    status: normalizeStatus(row.Estado),
    expectedYield: toNumber(row['Rendimiento esperado (qq/ha)']),
    actualYield: toNumber(row['Rendimiento obtenido (qq/ha)']),
    totalKgs: toNumber(row['Kgs totales']),
    stockKgs: toNumber(row['Kgs en Stock']),
    truckKgs: truckFromStock + truckFromHarvest,
    checkKgs: toNumber(row['Kgs Check']),
    year: String(row['Año de campaña'] ?? ''),
    sowingDate: row['Fecha de siembra'],
    estimatedHarvestDate: row['Fecha estimada de cosecha'],
    harvestStartDate: row['Inicio cosecha'] ?? null,
    harvestEndDate: row['Fin cosecha'] ?? null,
    harvestDurationDays: row['Duración Cosecha']
      ? Number(row['Duración Cosecha'])
      : null,
    lotIds: extractLinkRowIds(row.Lotes as any),
  };
}

// --- Public functions ---
/// Raw
export async function getCyclesRaw(): Promise<CycleRaw[]> {
  return getTableRows<CycleRaw>(CYCLES_TABLE_ID);
}

/// DTO for UI
export async function getCyclesDto(): Promise<CycleDto[]> {
  const rows = await getCyclesRaw();

  return rows.map(mapCycleRow);
}

export async function getCycleByIdDto(id: number): Promise<CycleDto | null> {
  try {
    const row = await getTableRowById<CycleRaw>(CYCLES_TABLE_ID, id);
    return mapCycleRow(row);
  } catch (error) {
    console.error('Error fetching cycle by id', id, error);
    return null;
  }
}
