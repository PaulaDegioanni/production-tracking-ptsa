// src/lib/baserow/harvests.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  extractLinkRowLabelsTrimmed,
  normalizeField,
  toNumber,
} from './utils';

import {
  splitIsoToDateAndTimeLocal,
  combineDateAndTimeToIso,
} from '@/lib/forms/datetime';

export const HARVESTS_TABLE_ID = Number(
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
  fieldId: number | null;
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
  const fieldIds = extractLinkRowIds(row.Campo);
  const fieldId = fieldIds[0] ?? null;
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
    fieldId,
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

// ---------------------------
// ✅ MAPPER: DTO -> Form values (para editar)
// ---------------------------
export function normalizeHarvestDtoToFormValues(
  harvest: HarvestDto
): Record<string, any> {
  const { date, time } = splitIsoToDateAndTimeLocal(harvest.date);

  return {
    // si tu form usa Fecha_fecha + Fecha_hora:
    Fecha_fecha: date,
    Fecha_hora: time,

    'KG Cosechados': harvest.harvestedKgs ?? '',
    Campo: harvest.fieldId ?? '',

    Lotes: harvest.lotsIds ?? [],
    'Ciclo de siembra': harvest.cycleId ?? '',
    Cultivo: harvest.crop ?? '',

    Stock: harvest.stockIds?.[0] ?? '',
    'Viajes camión directos': harvest.directTruckTripIds?.[0] ?? '',

    Notas: harvest.notes ?? '',
  };
}

// ---------------------------
// ✅ MAPPER: Form values -> Baserow payload (crear/editar)
// ---------------------------
export function normalizeHarvestFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean }
): Record<string, any> {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;

  // ✅ si ahora el form separa fecha/hora:
  const datePart = (formValues['Fecha_fecha'] ?? '').trim();
  const timePart = (formValues['Fecha_hora'] ?? '').trim();
  if (!datePart || !timePart) {
    throw new Error('La fecha y la hora son obligatorias');
  }

  const isoDate = combineDateAndTimeToIso(datePart, timePart);

  const payload: Record<string, any> = {
    Fecha: isoDate,
  };

  const rawKgs = formValues['KG Cosechados'];
  const harvestedKgs = parseFloat(rawKgs);
  if (Number.isNaN(harvestedKgs)) {
    throw new Error('Ingresá un número válido para los kilos cosechados');
  }
  payload['KG Cosechados'] = harvestedKgs;

  const lotsValue = Array.isArray(formValues.Lotes) ? formValues.Lotes : [];
  const lotIds = lotsValue
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  if (!lotIds.length) {
    throw new Error('Seleccioná al menos un lote');
  }
  payload.Lotes = lotIds;

  const cycleValue = formValues['Ciclo de siembra'];
  const cycleId = Number(cycleValue);
  if (!cycleId || Number.isNaN(cycleId)) {
    throw new Error('Seleccioná un ciclo de siembra válido');
  }
  payload['Ciclo de siembra'] = [cycleId];

  const stockValue = formValues.Stock;
  const stockId = Number(stockValue);
  if (stockValue && stockId && !Number.isNaN(stockId)) {
    payload.Stock = [stockId];
  } else if (includeEmptyOptional) {
    payload.Stock = [];
  }

  const tripValue = formValues['Viajes camión directos'];
  const tripId = Number(tripValue);
  if (tripValue && tripId && !Number.isNaN(tripId)) {
    payload['Viajes camión directos'] = [tripId];
  } else if (includeEmptyOptional) {
    payload['Viajes camión directos'] = [];
  }

  const notesValue = (formValues['Notas'] ?? '').trim();
  if (notesValue || includeEmptyOptional) {
    payload.Notas = notesValue;
  }

  return payload;
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
  return rows.map(mapHarvestRawToDto).filter((h) => h.cycleId == cycleId);
}
