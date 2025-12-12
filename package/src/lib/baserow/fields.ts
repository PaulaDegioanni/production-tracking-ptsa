// src/lib/baserow/fields.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  normalizeField,
  toNumber,
  toStringOrEmpty,
} from './utils';

const FIELDS_TABLE_ID = Number(process.env.NEXT_PUBLIC_BASEROW_FIELDS_TABLE_ID);

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

// --- Public helpers ---
export async function getFieldsRaw(): Promise<FieldRaw[]> {
  return getTableRows<FieldRaw>(FIELDS_TABLE_ID);
}

export async function getFieldsDto(): Promise<FieldDto[]> {
  const rows = await getFieldsRaw();
  return rows.map(mapFieldRow);
}
