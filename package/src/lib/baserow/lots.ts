// src/lib/baserow/lots.ts
import 'server-only';
import { getTableRows, patchTableRow, deleteTableRow } from './client';
import { createTableRow } from './rowsCrud';
import {
  extractLinkRowIds,
  toNumber,
  toStringOrEmpty,
  normalizeField,
} from './utils';

export const LOTS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_LOTS_TABLE_ID
);

if (!LOTS_TABLE_ID || Number.isNaN(LOTS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_LOTS_TABLE_ID is not a valid number in .env'
  );
}

// Raw shape as returned by Baserow
export type LotRaw = {
  id: number;
  'Nombre / Código Lote'?: any;
  Notas?: string | null;
  Campo?: any;
  'Superficie (ha)'?: number | string | null;
  Etiquetas?: any;
  Ciclos?: any; // legacy link field name
  'Ciclos de Siembra'?: any; // current link field name
};

// DTO used by the UI
export interface LotDto {
  id: number;
  code: string;
  notes: string;
  fieldName: string;
  fieldId: number | null;
  areaHa: number;
  cycleIds: number[];
}

function mapLotRawToDto(row: LotRaw): LotDto {
  const cycleLink = row['Ciclos de Siembra'] ?? row.Ciclos;
  const cycleIds = extractLinkRowIds(cycleLink);
  const fieldIds = extractLinkRowIds(row.Campo);
  const fieldId = fieldIds[0] ?? null;

  return {
    id: row.id,
    // Can be a simple string, formula or lookup → normalizeField
    code: normalizeField(row['Nombre / Código Lote']),
    notes: toStringOrEmpty(row.Notas),
    // Campo can also be option/lookup → normalizeField
    fieldName: normalizeField(row.Campo),
    fieldId,
    areaHa: toNumber(row['Superficie (ha)']),
    cycleIds,
  };
}

// Payload helpers

type LotPayloadBase = {
  code?: string;
  notes?: string | null;
  fieldId?: number | null;
  areaHa?: number | string | null;
  cycleIds?: number[] | null;
};

export type LotCreatePayload = LotPayloadBase & {
  code: string;
};

export type LotUpdatePayload = LotPayloadBase;

function mapLotPayloadToBaserowPayload(
  payload: LotPayloadBase,
  options?: { requireCode?: boolean }
): Record<string, any> {
  const result: Record<string, any> = {};
  const requireCode = options?.requireCode ?? false;

  if (payload.code !== undefined) {
    const code = payload.code.trim();
    if (!code) {
      throw new Error('Ingresá un nombre o código válido para el lote');
    }
    result['Nombre / Código Lote'] = code;
  } else if (requireCode) {
    throw new Error('Ingresá un nombre o código válido para el lote');
  }

  if (payload.notes !== undefined) {
    const value = payload.notes ?? '';
    result['Notas'] = String(value).trim();
  }

  if (payload.fieldId !== undefined) {
    const fieldId = Number(payload.fieldId);
    if (payload.fieldId === null || payload.fieldId === undefined) {
      result['Campo'] = [];
    } else if (!Number.isFinite(fieldId) || fieldId <= 0) {
      throw new Error('Seleccioná un campo válido');
    } else {
      result['Campo'] = [fieldId];
    }
  }

  if (payload.areaHa !== undefined) {
    const raw = payload.areaHa;
    if (
      raw === null ||
      raw === '' ||
      (typeof raw === 'string' && raw.trim() === '')
    ) {
      result['Superficie (ha)'] = null;
    } else {
      const numericValue = Number(raw);
      if (!Number.isFinite(numericValue)) {
        throw new Error('Ingresá una superficie válida (número)');
      }
      result['Superficie (ha)'] = numericValue;
    }
  }

  if (payload.cycleIds !== undefined) {
    const sanitizedCycleIds = Array.isArray(payload.cycleIds)
      ? payload.cycleIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : [];
    result['Ciclos de Siembra'] = sanitizedCycleIds;
  }

  return result;
}

// Public API

export async function getLotsRaw(): Promise<LotRaw[]> {
  return getTableRows<LotRaw>(LOTS_TABLE_ID);
}

export async function getLotsDto(): Promise<LotDto[]> {
  const rows = await getLotsRaw();
  return rows.map(mapLotRawToDto);
}

export async function createLot(payload: LotCreatePayload): Promise<LotDto> {
  const baserowPayload = mapLotPayloadToBaserowPayload(payload, {
    requireCode: true,
  });

  const row = await createTableRow<LotRaw>(LOTS_TABLE_ID, baserowPayload);
  return mapLotRawToDto(row);
}

export async function updateLot(
  lotId: number,
  payload: LotUpdatePayload
): Promise<LotDto> {
  if (!lotId || Number.isNaN(lotId)) {
    throw new Error('El lote seleccionado no es válido');
  }

  const baserowPayload = mapLotPayloadToBaserowPayload(payload);

  if (!Object.keys(baserowPayload).length) {
    throw new Error('No hay cambios para guardar');
  }

  const row = await patchTableRow<LotRaw>(LOTS_TABLE_ID, lotId, baserowPayload);
  return mapLotRawToDto(row);
}

export async function deleteLot(lotId: number): Promise<void> {
  if (!lotId || Number.isNaN(lotId)) {
    throw new Error('El lote seleccionado no es válido');
  }

  await deleteTableRow(LOTS_TABLE_ID, lotId);
}

export async function getLotsByCycleIdDto(cycleId: number): Promise<LotDto[]> {
  const rows = await getLotsRaw();
  return rows
    .map(mapLotRawToDto)
    .filter((lot) => lot.cycleIds.includes(cycleId));
}

export async function getLotsByIdsDto(lotIds: number[]): Promise<LotDto[]> {
  if (!lotIds.length) return [];

  const rows = await getLotsRaw();
  const allLots = rows.map(mapLotRawToDto);

  const idSet = new Set(lotIds);
  return allLots.filter((lot) => idSet.has(lot.id));
}

export type LotOption = { id: number; label: string };

export async function getLotsByFieldId(
  fieldId: number
): Promise<LotOption[]> {
  if (!fieldId || Number.isNaN(fieldId)) {
    return [];
  }
  const lots = await getLotsDto();
  return lots
    .filter((lot) => lot.fieldId === fieldId)
    .map((lot) => ({
      id: lot.id,
      label: lot.code || `Lote #${lot.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getLotsByFieldIdDto(fieldId: number): Promise<LotDto[]> {
  if (!fieldId || Number.isNaN(fieldId)) {
    return [];
  }

  const rows = await getLotsRaw();
  return rows
    .map(mapLotRawToDto)
    .filter((lot) => lot.fieldId === fieldId);
}
