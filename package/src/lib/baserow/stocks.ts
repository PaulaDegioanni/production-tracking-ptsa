// src/lib/baserow/stocks.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  extractLinkRowLabelsTrimmed,
  normalizeField,
  toNumber,
} from './utils';

export const STOCK_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_STOCK_TABLE_ID
);

if (!STOCK_TABLE_ID || Number.isNaN(STOCK_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_STOCK_TABLE_ID is not a valid number in .env'
  );
}

// Raw shape from Baserow (only fields we currently need)
export type StockRaw = {
  id: number;
  ID?: unknown;
  Notas?: string | null;
  'Ciclo de siembra'?: unknown;
  'Tipo unidad'?: unknown;
  'Fecha de creación'?: string | null;
  'Cosechas Origen'?: unknown;
  'Kgs Ingresados a Stock'?: number | string | null;
  'Total kgs ingresados'?: number | string | null;
  'Viajes de camión desde stock'?: unknown;
  'Total kgs egresados cosecha'?: number | string | null;
  'Kgs actuales'?: number | string | null;
  Estado?: unknown;
  Campo?: unknown;
  Cultivo?: unknown;
};

export type StockStatus = 'Nuevo' | 'Vacío' | 'Parcial' | 'Completo' | string;

export interface StockDto {
  id: number;
  stockId: string;
  name: string;
  notes?: string;
  cycleIds: number[];
  cycleLabels: string[];
  unitType: string;
  unitTypeId: number | null;
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
  statusId: number | null;
  field: string;
  fieldId: number | null;
  crop: string;
}

const extractSingleSelectId = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const rawId = (value as { id: unknown }).id;
    if (typeof rawId === 'number' && !Number.isNaN(rawId)) {
      return rawId;
    }
    if (typeof rawId === 'string' && rawId.trim() !== '') {
      const parsed = Number(rawId);
      return Number.isNaN(parsed) ? null : parsed;
    }
  }

  if (Array.isArray(value) && value.length) {
    const [first] = value;
    if (typeof first === 'number' && !Number.isNaN(first)) {
      return first;
    }
    if (typeof first === 'string' && first.trim() !== '') {
      const parsed = Number(first);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (first && typeof first === 'object' && 'id' in first) {
      const rawId = (first as { id: unknown }).id;
      if (typeof rawId === 'number' && !Number.isNaN(rawId)) {
        return rawId;
      }
      if (typeof rawId === 'string' && rawId.trim() !== '') {
        const parsed = Number(rawId);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
  }

  return null;
};

function mapStockRawToDto(row: StockRaw): StockDto {
  const cycleIds = extractLinkRowIds(row['Ciclo de siembra']);
  const cycleLabels = extractLinkRowLabels(row['Ciclo de siembra']);
  const originHarvestIds = extractLinkRowIds(row['Cosechas Origen']);
  const originHarvestsLabels = extractLinkRowLabelsTrimmed(
    row['Cosechas Origen']
  );
  const truckTripIds = extractLinkRowIds(row['Viajes de camión desde stock']);
  const truckTripLabels = extractLinkRowLabelsTrimmed(
    row['Viajes de camión desde stock']
  );
  const fieldIds = extractLinkRowIds(row.Campo);
  const fieldId = fieldIds[0] ?? null;

  const normalizedId = normalizeField(row.ID) || String(row.id);

  return {
    id: row.id,
    stockId: normalizedId,
    name: normalizedId,
    notes: row.Notas ?? undefined,
    cycleIds,
    cycleLabels,
    unitType: normalizeField(row['Tipo unidad']),
    unitTypeId: extractSingleSelectId(row['Tipo unidad']),
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
    statusId: extractSingleSelectId(row.Estado),
    field: normalizeField(row.Campo),
    fieldId,
    crop: normalizeField(row.Cultivo),
  };
}

const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function normalizeStockDtoToFormValues(
  stock: StockDto
): Record<string, any> {
  return {
    'Tipo unidad': stock.unitTypeId ?? '',
    Campo: stock.fieldId ?? '',
    'Ciclo de siembra': stock.cycleIds[0] ?? '',
    Cultivo: stock.crop ?? '',
    'Fecha de creación': stock.createdAt || getTodayDateString(),
    Estado: stock.statusId ?? '',
    Notas: stock.notes ?? '',
    ID: stock.stockId,
  };
}

export function normalizeStockFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean }
): Record<string, any> {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;
  const payload: Record<string, any> = {};

  const unitTypeValue = Number(formValues['Tipo unidad']);
  if (!unitTypeValue || Number.isNaN(unitTypeValue)) {
    throw new Error('Seleccioná un tipo de unidad válido');
  }
  payload['Tipo unidad'] = unitTypeValue;

  const cycleRaw = formValues['Ciclo de siembra'];
  const cycleValue =
    cycleRaw === '' || cycleRaw === null || cycleRaw === undefined
      ? null
      : Number(cycleRaw);
  if (cycleValue && !Number.isNaN(cycleValue)) {
    payload['Ciclo de siembra'] = [cycleValue];
  } else if (includeEmptyOptional) {
    payload['Ciclo de siembra'] = [];
  }

  const creationDate = String(formValues['Fecha de creación'] ?? '').trim();
  if (!creationDate) {
    throw new Error('Ingresá una fecha de creación válida (YYYY-MM-DD)');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(creationDate)) {
    throw new Error('Ingresá una fecha de creación válida (YYYY-MM-DD)');
  }
  payload['Fecha de creación'] = creationDate;

  const statusValue = Number(formValues['Estado']);
  if (!statusValue || Number.isNaN(statusValue)) {
    throw new Error('Seleccioná un estado válido');
  }
  payload.Estado = statusValue;

  const notesValue = (formValues['Notas'] ?? '').trim();
  if (notesValue || includeEmptyOptional) {
    payload.Notas = notesValue;
  }

  return payload;
}

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
