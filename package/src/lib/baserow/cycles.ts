// src/lib/baserow/ciclos.ts
import { getTableRows, getTableRowById, getTableFields } from './client';
import { createTableRow } from './rowsCrud';
import { toNumber, normalizeField, extractLinkRowIds } from './utils';

export const CYCLES_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_CYCLES_TABLE_ID
);

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
  Lotes?:
    | Array<{
        id: number;
        value: string;
        order: string;
      }>
    | null;
  'Superficie (has)'?: number;
  'Rendimiento esperado (qq/ha)'?: number;
  'Rendimiento obtenido (qq/ha)'?: number;
  'Kgs totales'?: number;
  'Kgs en Stock'?: number;
  'Kgs Camión desde Stock'?: number;
  'Kgs Camión desde Cosecha'?: number;
  'Kgs Check'?: number;
  Periodo?: string;
  'Fecha de siembra'?: string;
  'Fecha inicio barbecho'?: string;
  'Fecha estimada de cosecha'?: string;
  'Inicio cosecha'?: string;
  'Fin cosecha'?: string;
  'Duración Cosecha'?: number;
  'Duración cultivo (días)'?: number | null;
};

// --- DTO: normalized shape used in the UI ---
export type CycleStatus =
  | 'planificado'
  | 'barbecho'
  | 'sembrado'
  | 'listo-para-cosechar'
  | 'en-cosecha'
  | 'cosechado';

export interface CycleDto {
  id: number;
  cycleId: string;
  field: string;
  fieldId: number | null;
  crop: string;
  areaHa: number;
  status: CycleStatus;
  expectedYield: number; // qq/ha
  actualYield: number; // qq/ha
  totalKgs: number;
  stockKgs: number;
  truckKgs: number;
  checkKgs: number;
  period: string;
  sowingDate?: string;
  fallowStartDate?: string | null;
  estimatedHarvestDate?: string;
  harvestStartDate?: string | null;
  harvestEndDate?: string | null;
  harvestDurationDays?: number | null;
  cropDurationDays?: number | null;
  lotIds: number[];
}

// Baserow duration fields store values as seconds (float). UI works in days.
const SECONDS_PER_DAY = 86400;

export const daysToDurationSeconds = (days: number): number => {
  if (!Number.isFinite(days)) return 0;
  return Math.round(days * SECONDS_PER_DAY);
};

export const durationSecondsToDays = (seconds: number): number => {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds / SECONDS_PER_DAY);
};

// --- Internal helpers to map raw -> dto ---
function normalizeStatus(option?: CycleRaw['Estado']): CycleStatus {
  const v = (option?.value || '').toLowerCase();

  if (v.includes('planificado')) return 'planificado';
  if (v.includes('barbecho')) return 'barbecho';
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
  const fieldIds = extractLinkRowIds(row.Campo as any);
  const fieldId = fieldIds[0] ?? null;

  return {
    id: row.id,
    cycleId: String(row.ID ?? ''),
    field: normalizeField(row.Campo ?? ''),
    fieldId,
    crop: normalizeField(row.Cultivo?.value ?? ''),
    areaHa: toNumber(row['Superficie (has)']),
    status: normalizeStatus(row.Estado),
    expectedYield: toNumber(row['Rendimiento esperado (qq/ha)']),
    actualYield: toNumber(row['Rendimiento obtenido (qq/ha)']),
    totalKgs: toNumber(row['Kgs totales']),
    stockKgs: toNumber(row['Kgs en Stock']),
    truckKgs: truckFromStock + truckFromHarvest,
    checkKgs: toNumber(row['Kgs Check']),
    period: String(row['Periodo'] ?? ''),
    sowingDate: row['Fecha de siembra'],
    fallowStartDate: row['Fecha inicio barbecho'] ?? null,
    estimatedHarvestDate: row['Fecha estimada de cosecha'],
    harvestStartDate: row['Inicio cosecha'] ?? null,
    harvestEndDate: row['Fin cosecha'] ?? null,
    harvestDurationDays: row['Duración Cosecha']
      ? Number(row['Duración Cosecha'])
      : null,
    cropDurationDays:
      typeof row['Duración cultivo (días)'] === 'number'
        ? durationSecondsToDays(row['Duración cultivo (días)'])
        : null,
    lotIds: extractLinkRowIds(row.Lotes as any),
  };
}

export type CycleCreateValues = {
  lotIds: number[];
  fallowStartDate?: string | null;
  sowingDate?: string | null;
  cropOptionId: number | null;
  statusOptionId: number | null;
  seed?: string;
  expectedYield?: number | null;
  notes?: string;
  cropDurationDays?: number | null;
};

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

export async function getCycleRowIdByLabel(
  cycleLabel: string
): Promise<number | null> {
  const rows = await getCyclesRaw();

  const match = rows.find((row) => {
    const label = String(row.ID ?? '').trim();
    return label === cycleLabel.trim();
  });

  return match ? match.id : null;
}

export async function createCycle(
  values: CycleCreateValues
): Promise<CycleDto> {
  const normalizedLotIds = Array.isArray(values.lotIds)
    ? values.lotIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : [];

  if (!normalizedLotIds.length) {
    throw new Error('Debés seleccionar al menos un lote');
  }

  const payload: Record<string, any> = {
    Lotes: normalizedLotIds,
    'Fecha inicio barbecho': values.fallowStartDate || null,
    'Fecha de siembra': values.sowingDate || null,
    Cultivo: values.cropOptionId ?? null,
    Estado: values.statusOptionId ?? null,
    Semilla: values.seed?.trim() ?? '',
    Notas: values.notes?.trim() ?? '',
  };

  if (
    values.cropDurationDays !== undefined &&
    values.cropDurationDays !== null &&
    Number.isFinite(values.cropDurationDays)
  ) {
    payload['Duración cultivo (días)'] = daysToDurationSeconds(
      Number(values.cropDurationDays)
    );
  } else {
    payload['Duración cultivo (días)'] = null;
  }

  if (
    values.expectedYield !== undefined &&
    values.expectedYield !== null &&
    Number.isFinite(values.expectedYield)
  ) {
    payload['Rendimiento esperado (qq/ha)'] = Number(values.expectedYield);
  } else {
    payload['Rendimiento esperado (qq/ha)'] = null;
  }

  const row = await createTableRow<CycleRaw>(CYCLES_TABLE_ID, payload);
  return mapCycleRow(row);
}

type SelectOption = { id: number; value: string };

const normalizeOptionValue = (value?: string | null) =>
  (value ?? '').trim().toLowerCase();

export async function getCycleSingleSelectOptions(): Promise<{
  cropOptions: SelectOption[];
  statusOptions: SelectOption[];
  cropDefaultId: number | null;
  statusDefaultId: number | null;
}> {
  const fields = await getTableFields(CYCLES_TABLE_ID);

  const cropField = fields.find((field) => field.name === 'Cultivo');
  const statusField = fields.find((field) => field.name === 'Estado');

  const cropOptions: SelectOption[] = Array.isArray(
    cropField?.select_options
  )
    ? cropField.select_options!.map((option) => ({
        id: option.id,
        value: option.value,
      }))
    : [];

  const statusOptions: SelectOption[] = Array.isArray(
    statusField?.select_options
  )
    ? statusField.select_options!.map((option) => ({
        id: option.id,
        value: option.value,
      }))
    : [];

  const cropDefaultId =
    cropField?.single_select_default ??
    cropOptions.find(
      (option) => normalizeOptionValue(option.value) === 'soja'
    )?.id ??
    null;

  const statusDefaultId =
    statusOptions.find(
      (option) => normalizeOptionValue(option.value) === 'planificado'
    )?.id ??
    statusField?.single_select_default ??
    null;

  return {
    cropOptions,
    statusOptions,
    cropDefaultId: cropDefaultId ?? null,
    statusDefaultId: statusDefaultId ?? null,
  };
}
