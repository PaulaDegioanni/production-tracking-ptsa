// src/lib/baserow/providers.ts
import {
  extractLinkRowIds,
  normalizeField,
  toNumber,
} from './utils';

export const PROVIDERS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID
);

type BaserowClientModule = typeof import('./client');
let baserowClientPromise: Promise<BaserowClientModule> | null = null;

const loadBaserowClient = () => {
  if (!baserowClientPromise) {
    baserowClientPromise = import('./client');
  }
  return baserowClientPromise;
};

type TruckTripHelpersModule = typeof import('./truckTrips');
let truckTripsHelpersPromise: Promise<TruckTripHelpersModule> | null = null;

const loadTruckTripHelpers = () => {
  if (!truckTripsHelpersPromise) {
    truckTripsHelpersPromise = import('./truckTrips');
  }
  return truckTripsHelpersPromise;
};

if (!PROVIDERS_TABLE_ID || Number.isNaN(PROVIDERS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID is not a valid number in .env'
  );
}

export type ProviderRaw = {
  id: number;
  Name?: unknown;
  Nombre?: unknown;
  Notes?: unknown;
  Admite?:
    | Array<{
        id?: unknown;
        value?: unknown;
      }>
    | unknown;
  'Viajes de camión'?:
    | Array<{
        id?: unknown;
        value?: unknown;
      }>
    | unknown;
  'Kgs entregados'?: unknown;
  'Periodo viajes'?: Array<{ value?: unknown }> | unknown;
};

export type ProviderDto = {
  id: number;
  name: string;
  notes: string | null;
  admitsIds: number[];
  admitsLabels: string[];
  tripIds: number[];
  tripLabels: string[];
  deliveredKgs: number;
  periodLabels: string[];
};

const extractLabels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (
        item &&
        typeof item === 'object' &&
        'value' in item &&
        (item as { value?: unknown }).value !== undefined
      ) {
        return normalizeField((item as { value?: unknown }).value);
      }
      return normalizeField(item);
    })
    .map((label) => label.trim())
    .filter((label) => Boolean(label));
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return toNumber(value);
};

export function mapProviderRawToDto(row: ProviderRaw): ProviderDto {
  const label =
    normalizeField(row.Name) ||
    normalizeField(row.Nombre) ||
    `Proveedor #${row.id}`;
  const notes = normalizeField(row.Notes) || null;
  const admitsIds = extractLinkRowIds(row.Admite);
  const admitsLabels = extractLabels(row.Admite);
  const tripIds = extractLinkRowIds(row['Viajes de camión']);
  const tripLabels = extractLabels(row['Viajes de camión']);
  const deliveredKgs = parseNumber(row['Kgs entregados']);
  const periodLabels = Array.from(
    new Set(extractLabels(row['Periodo viajes']))
  );

  return {
    id: row.id,
    name: label,
    notes,
    admitsIds,
    admitsLabels,
    tripIds,
    tripLabels,
    deliveredKgs,
    periodLabels,
  };
}

export async function getProvidersDto(): Promise<ProviderDto[]> {
  const { getTableRows } = await loadBaserowClient();
  const rows = await getTableRows<ProviderRaw>(PROVIDERS_TABLE_ID);
  const providers = rows.map(mapProviderRawToDto);

  const allTripIds = Array.from(
    new Set(providers.flatMap((provider) => provider.tripIds))
  );

  let tripIdMap: Map<number, string> | null = null;
  if (allTripIds.length) {
    const { getTruckTripIdMap } = await loadTruckTripHelpers();
    tripIdMap = await getTruckTripIdMap(allTripIds);
  }

  const enriched = tripIdMap
    ? providers.map((provider) => ({
        ...provider,
        tripLabels: provider.tripIds.map((tripId, index) => {
          const mapped = tripIdMap?.get(tripId);
          const fallback = provider.tripLabels[index] || `#${tripId}`;
          return mapped || fallback;
        }),
      }))
    : providers;

  return enriched.sort((a, b) => a.name.localeCompare(b.name));
}
