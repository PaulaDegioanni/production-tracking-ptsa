// src/lib/baserow/lots.ts
import { getTableRows } from './client';
import {
  extractLinkRowIds,
  toNumber,
  toStringOrEmpty,
  normalizeField,
} from './utils';

const LOTS_TABLE_ID = Number(process.env.NEXT_PUBLIC_BASEROW_LOTS_TABLE_ID);

if (!LOTS_TABLE_ID || Number.isNaN(LOTS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_LOTS_TABLE_ID is not a valid number in .env'
  );
}

// Raw shape as returned by Baserow
export type LotRaw = {
  id: number;
  'Nombre / Código Lote'?: any;
  Descripción?: string | null;
  'Activo ?'?: boolean;
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
  description: string;
  isActive: boolean;
  fieldName: string;
  areaHa: number;
  cycleIds: number[];
}

function mapLotRawToDto(row: LotRaw): LotDto {
  const cycleLink = row['Ciclos de Siembra'] ?? row.Ciclos;
  const cycleIds = extractLinkRowIds(cycleLink);

  return {
    id: row.id,
    // Can be a simple string, formula or lookup → normalizeField
    code: normalizeField(row['Nombre / Código Lote']),
    description: toStringOrEmpty(row.Descripción),
    isActive: Boolean(row['Activo ?']),
    // Campo can also be option/lookup → normalizeField
    fieldName: normalizeField(row.Campo),
    areaHa: toNumber(row['Superficie (ha)']),
    cycleIds,
  };
}

// Public API

export async function getLotsRaw(): Promise<LotRaw[]> {
  return getTableRows<LotRaw>(LOTS_TABLE_ID);
}

export async function getLotsDto(): Promise<LotDto[]> {
  const rows = await getLotsRaw();
  return rows.map(mapLotRawToDto);
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
