// src/lib/baserow/truckTrips.ts
import { getTableRows } from './client';
import { getCycleRowIdByLabel } from './cycles';
import {
  extractLinkRowIds,
  extractLinkRowLabels,
  toNumber,
  toStringOrEmpty,
  normalizeField,
  extractSingleSelectId,
} from './utils';

export const TRUCK_TRIPS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_TRUCK_TRIPS_TABLE_ID
);

if (!TRUCK_TRIPS_TABLE_ID || Number.isNaN(TRUCK_TRIPS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_TRUCK_TRIPS_TABLE_ID is not a valid number in .env'
  );
}

// ---- Raw shape as returned by Baserow ----
export type TruckTripRaw = {
  id: number;
  ID?: any; // fórmula / lookup (array con { id, value })
  Notas?: string | null;

  Camión?: any; // link_row a camión (array con { id, value })
  CTG?: number; //grain trazability code
  'Ciclo de siembra Cosecha'?: any; // (por ahora no lo usamos)
  'Fecha de salida'?: string | null;
  Periodo?: string | null;

  'Campo Origen Cosecha'?: any; // array de opciones / lookups
  'Tipo destino'?: any; // single select
  Proveedor?: any;
  'Detalle Destino (opcional)'?: string | null;

  'Kg carga origen'?: string | number | null;
  'Kg carga destino'?: string | number | null;
  Estado?: any; // single select

  'Cosecha Origen (opcional)'?: any; // link_row a Cosechas
  'Stock Origen (opcional)'?: any; // link_row a Stock

  'Ciclo de siembra Stock'?: any; // array con { ids: { tableId: rowId }, value }
  'Ciclo de siembra'?: string | null; // texto plano

  'N°'?: number | null;

  'Campo Origen Stock'?: any; // array de opciones / lookups
  'Campo Origen'?: string | null; // texto (campo origen unificado)
};

// ---- DTO used by the UI ----
export type TripOriginType = 'harvest' | 'stock' | 'unknown';

export interface TruckTripDto {
  id: number;
  tripId: string; // from ID
  notes?: string;

  date: string | null; // Fecha de salida
  period: string | null;
  truckPlate: string; // Camión
  truckId: number | null;
  ctg: number;
  destinationType: string; // Tipo destino (Puerto, Acopio, etc.)
  destinationTypeId: number | null;
  destinationDetail: string;
  provider: string;
  providerIds: number[];

  totalKgsOrigin: number; // Kg carga origen
  totalKgsDestination: number; // Kg carga destino
  status: string; // Estado (Entregado, Pendiente, etc.)
  statusId: number | null;

  harvestOriginIds: number[]; // Cosecha Origen (opcional)
  stockOriginIds: number[]; // Stock Origen (opcional)
  originType: TripOriginType;

  originField: string; // Campo Origen (texto unificado)
  originFieldFromStock: string; // Campo Origen Stock (lookup)
  originFieldFromHarvest: string; // Campo Origen Cosecha (lookup)

  cycleLabel: string; // Ciclo de siembra (texto)
  cycleRowId: number | null;
}

// ---- Mapping RAW -> DTO ----
function mapTruckTripRawToDto(row: TruckTripRaw): TruckTripDto {
  const harvestOriginIds = extractLinkRowIds(row['Cosecha Origen (opcional)']);
  const stockOriginIds = extractLinkRowIds(row['Stock Origen (opcional)']);
  const truckIds = extractLinkRowIds(row['Camión']);
  const truckId = truckIds[0] ?? null;
  const providerIds = extractLinkRowIds(row['Proveedor']);
  const providerLabels = extractLinkRowLabels(row['Proveedor']);

  let originType: TripOriginType = 'unknown';
  if (harvestOriginIds.length) originType = 'harvest';
  else if (stockOriginIds.length) originType = 'stock';

  return {
    id: row.id,
    tripId: normalizeField(row.ID),
    notes: row.Notas ?? undefined,

    date: row['Fecha de salida'] ?? null,
    period: normalizeField(row['Periodo']) || null,
    truckPlate: normalizeField(row['Camión']),
    truckId,
    ctg: toNumber(row['CTG']),
    destinationType: normalizeField(row['Tipo destino']),
    destinationTypeId: extractSingleSelectId(row['Tipo destino']),
    destinationDetail: toStringOrEmpty(row['Detalle Destino (opcional)']),
    provider: providerLabels[0] || normalizeField(row['Proveedor']),
    providerIds,

    totalKgsOrigin: toNumber(row['Kg carga origen']),
    totalKgsDestination: toNumber(row['Kg carga destino']),
    status: normalizeField(row.Estado),
    statusId: extractSingleSelectId(row.Estado),

    harvestOriginIds,
    stockOriginIds,
    originType,

    originField: toStringOrEmpty(row['Campo Origen']),
    originFieldFromStock: normalizeField(row['Campo Origen Stock']),
    originFieldFromHarvest: normalizeField(row['Campo Origen Cosecha']),

    cycleLabel: toStringOrEmpty(row['Ciclo de siembra']),
    cycleRowId: null,
  };
}

// ---- Public API ----

export async function getTruckTripsRaw(): Promise<TruckTripRaw[]> {
  return getTableRows<TruckTripRaw>(TRUCK_TRIPS_TABLE_ID);
}

export async function getTruckTripsDto(): Promise<TruckTripDto[]> {
  const rows = await getTruckTripsRaw();
  return rows.map(mapTruckTripRawToDto);
}

/**
 * Returns trips whose origin is:
 *  - any harvest in harvestIds, or
 *  - any stock unit in stockIds.
 */
export async function getTruckTripsByOriginsDto(options: {
  harvestIds?: number[];
  stockIds?: number[];
}): Promise<TruckTripDto[]> {
  const { harvestIds = [], stockIds = [] } = options;

  if (!harvestIds.length && !stockIds.length) return [];

  const allTrips = await getTruckTripsDto();

  const harvestSet = new Set(harvestIds);
  const stockSet = new Set(stockIds);

  return allTrips.filter((trip) => {
    const hasHarvestOrigin = trip.harvestOriginIds.some((id) =>
      harvestSet.has(id)
    );
    const hasStockOrigin = trip.stockOriginIds.some((id) => stockSet.has(id));
    return hasHarvestOrigin || hasStockOrigin;
  });
}

export async function getTruckTripsWithCycleIdsDto(): Promise<TruckTripDto[]> {
  // 1) viajes base
  const trips = await getTruckTripsDto();

  // 2) resolver ids en paralelo (Promise.all)
  const enriched = await Promise.all(
    trips.map(async (trip) => {
      const cycleRowId = trip.cycleLabel
        ? await getCycleRowIdByLabel(trip.cycleLabel)
        : null;

      return {
        ...trip,
        cycleRowId,
      };
    })
  );

  return enriched;
}
