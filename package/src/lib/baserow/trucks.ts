// src/lib/baserow/trucks.ts
import {
  type BaserowOption,
  IdLabelOption,
  extractLinkRowIds,
  extractSingleSelectId,
  mapSelectOptions,
  normalizeField,
} from './utils';
import { getTruckTripIdMap } from './truckTrips';

export const TRUCKS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_TRUCKS_TABLE_ID
);

if (!TRUCKS_TABLE_ID || Number.isNaN(TRUCKS_TABLE_ID)) {
  throw new Error(
    'NEXT_PUBLIC_BASEROW_TRUCKS_TABLE_ID is not a valid number in .env'
  );
}

type BaserowClientModule = typeof import('./client');
let baserowClientPromise: Promise<BaserowClientModule> | null = null;

const loadBaserowClient = () => {
  if (!baserowClientPromise) {
    baserowClientPromise = import('./client');
  }
  return baserowClientPromise;
};

export type TruckRaw = {
  id: number;
  Patente?: unknown;
  Propietario?: unknown;
  Tipo?: { id?: unknown; value?: unknown } | unknown;
  'Viajes de camión'?:
    | Array<{
        id?: unknown;
        value?: unknown;
      }>
    | unknown;
  'Periodo viajes'?: Array<{ value?: unknown }> | unknown;
};

export type TruckDto = {
  id: number;
  plate: string;
  owner: string;
  typeId: number | null;
  typeLabel: string | null;
  tripIds: number[];
  tripLabels: string[];
  periodLabels: string[];
};

export type TruckTypeOption = IdLabelOption;

const normalizeLabelsArray = (value: unknown): string[] => {
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

export function mapTruckRawToDto(row: TruckRaw): TruckDto {
  const plate = normalizeField(row.Patente) || `Camión #${row.id}`;
  const owner = normalizeField(row.Propietario) || '';
  const typeLabel = normalizeField(row.Tipo) || null;
  const typeId = extractSingleSelectId(row.Tipo);
  const tripArray = row['Viajes de camión'];
  const tripIds = extractLinkRowIds(tripArray);
  const tripLabels = normalizeLabelsArray(tripArray);
  const periodLabels = normalizeLabelsArray(row['Periodo viajes']);

  return {
    id: row.id,
    plate,
    owner,
    typeId,
    typeLabel,
    tripIds,
    tripLabels,
    periodLabels,
  };
}

export const mapTruckTypeOptions = (options?: unknown) =>
  mapSelectOptions(Array.isArray(options) ? (options as BaserowOption[]) : undefined);

export async function getTrucksDto(): Promise<TruckDto[]> {
  const { getTableRows } = await loadBaserowClient();
  const rows = await getTableRows<TruckRaw>(TRUCKS_TABLE_ID);
  const mapped = rows.map(mapTruckRawToDto);

  const allTripIds = Array.from(
    new Set(mapped.flatMap((truck) => truck.tripIds))
  );
  const tripIdLookup = allTripIds.length
    ? await getTruckTripIdMap(allTripIds)
    : new Map<number, string>();

  const enriched = mapped.map((truck) => ({
    ...truck,
    tripLabels: truck.tripIds.map(
      (tripId) => tripIdLookup.get(tripId) ?? `#${tripId}`
    ),
  }));

  return enriched.sort((a, b) =>
    a.plate.localeCompare(b.plate, 'es-ES', { sensitivity: 'base' })
  );
}

export async function getTruckTypeOptions(): Promise<TruckTypeOption[]> {
  const { getTableFields } = await loadBaserowClient();
  const fields = await getTableFields(TRUCKS_TABLE_ID);
  const typeField = fields.find(
    (field) => field.name === 'Tipo' && field.type === 'single_select'
  );

  const options = mapTruckTypeOptions(typeField?.select_options);
  if (!options.length) {
    throw new Error('Campo "Tipo" en camiones no tiene opciones configuradas');
  }

  return options;
}
