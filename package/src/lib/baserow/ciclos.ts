// src/lib/baserow/ciclos.ts
import { getTableRows } from './client';

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

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

// --- Public functions ---
/// Raw
export async function getCyclesRaw(): Promise<CycleRaw[]> {
  return getTableRows<CycleRaw>(CYCLES_TABLE_ID);
}

/// DTO for UI
export async function getCyclesDto(): Promise<CycleDto[]> {
  const rows = await getCyclesRaw();

  return rows.map((row) => {
    const stockKgs = toNumber(row['Kgs en Stock']);
    const truckKgsFromStock = toNumber(row['Kgs Camión desde Stock']);
    const truckKgsFromHarvest = toNumber(row['Kgs Camión desde Cosecha']);

    return {
      id: row.id,
      cycleId: String(row.ID ?? ''),
      field: String(row.Campo ?? ''),
      crop: String(row.Cultivo?.value ?? ''),
      areaHa: toNumber(row['Superficie (has)']),
      status: normalizeStatus(row.Estado),
      expectedYield: toNumber(row['Rendimiento esperado (qq/ha)']),
      actualYield: toNumber(row['Rendimiento obtenido (qq/ha)']),
      totalKgs: toNumber(row['Kgs totales']),
      stockKgs,
      truckKgs: truckKgsFromStock + truckKgsFromHarvest,
      checkKgs: toNumber(row['Kgs Check']),
      year: String(row['Año de campaña'] ?? ''),
      sowingDate: row['Fecha de siembra'],
      estimatedHarvestDate: row['Fecha estimada de cosecha'],
    };
  });
}
