// src/lib/baserow/fields.ts
import { getTableRows, patchTableRow, deleteTableRow } from './client';
import { createTableRow } from './rowsCrud';
import {
  extractLinkRowIds,
  normalizeField,
  toNumber,
  toStringOrEmpty,
} from './utils';

export const FIELDS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_FIELDS_TABLE_ID
);

if (!FIELDS_TABLE_ID || Number.isNaN(FIELDS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_FIELDS_TABLE_ID is not a valid number in .env'
  );
}

// --- RAW types as returned by Baserow ---
export type FieldRaw = {
  id: number;
  Nombre?: string;
  Ubicación?: string | null;
  'Superficie (ha)'?: number | string | null;
  Notas?: string | null;
  Lotes?: unknown;
  'Alquiler ?'?: boolean;
  'Activo ?'?: boolean;
};

// --- DTO consumed by the UI ---
export interface FieldDto {
  id: number;
  name: string;
  location: string;
  totalAreaHa: number;
  notes: string;
  lotIds: number[];
  isRented: boolean;
  isActive: boolean;
}

function mapFieldRow(row: FieldRaw): FieldDto {
  return {
    id: row.id,
    name: normalizeField(row.Nombre),
    location: toStringOrEmpty(row.Ubicación),
    totalAreaHa: toNumber(row['Superficie (ha)']),
    notes: toStringOrEmpty(row.Notas),
    lotIds: extractLinkRowIds(row.Lotes),
    isRented: Boolean(row['Alquiler ?']),
    isActive: Boolean(row['Activo ?']),
  };
}

type FieldPayloadBase = {
  name?: string;
  location?: string | null;
  totalAreaHa?: number | string | null;
  notes?: string | null;
  lotIds?: number[] | null;
  isRented?: boolean | null;
  isActive?: boolean | null;
};

export type FieldCreatePayload = FieldPayloadBase & {
  name: string;
};

export type FieldUpdatePayload = FieldPayloadBase;

function mapFieldPayloadToBaserowPayload(
  payload: FieldPayloadBase,
  options?: { requireName?: boolean }
): Record<string, any> {
  const result: Record<string, any> = {};
  const requireName = options?.requireName ?? false;

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      throw new Error('Ingresá un nombre válido para el campo');
    }
    result['Nombre'] = name;
  } else if (requireName) {
    throw new Error('Ingresá un nombre válido para el campo');
  }

  if (payload.location !== undefined) {
    const value = payload.location ?? '';
    result['Ubicación'] = String(value).trim();
  }

  if (payload.totalAreaHa !== undefined) {
    const raw = payload.totalAreaHa;
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

  if (payload.notes !== undefined) {
    const value = payload.notes ?? '';
    result['Notas'] = String(value).trim();
  }

  if (payload.lotIds !== undefined) {
    const sanitizedLotIds = Array.isArray(payload.lotIds)
      ? payload.lotIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      : [];
    result.Lotes = sanitizedLotIds;
  }

  if (payload.isRented !== undefined) {
    result['Alquiler ?'] =
      payload.isRented === null ? null : Boolean(payload.isRented);
  }

  if (payload.isActive !== undefined) {
    result['Activo ?'] =
      payload.isActive === null ? null : Boolean(payload.isActive);
  }

  return result;
}

// --- Public helpers ---
export async function getFieldsRaw(): Promise<FieldRaw[]> {
  return getTableRows<FieldRaw>(FIELDS_TABLE_ID);
}

export async function getFieldsDto(): Promise<FieldDto[]> {
  const rows = await getFieldsRaw();
  return rows.map(mapFieldRow);
}

export async function createField(
  payload: FieldCreatePayload
): Promise<FieldDto> {
  const baserowPayload = mapFieldPayloadToBaserowPayload(payload, {
    requireName: true,
  });

  const row = await createTableRow<FieldRaw>(FIELDS_TABLE_ID, baserowPayload);
  return mapFieldRow(row);
}

export async function updateField(
  fieldId: number,
  payload: FieldUpdatePayload
): Promise<FieldDto> {
  if (!fieldId || Number.isNaN(fieldId)) {
    throw new Error('El campo seleccionado no es válido');
  }

  const baserowPayload = mapFieldPayloadToBaserowPayload(payload);

  if (!Object.keys(baserowPayload).length) {
    throw new Error('No hay cambios para guardar');
  }

  const row = await patchTableRow<FieldRaw>(
    FIELDS_TABLE_ID,
    fieldId,
    baserowPayload
  );
  return mapFieldRow(row);
}

export async function deleteField(fieldId: number): Promise<void> {
  if (!fieldId || Number.isNaN(fieldId)) {
    throw new Error('El campo seleccionado no es válido');
  }

  await deleteTableRow(FIELDS_TABLE_ID, fieldId);
}
