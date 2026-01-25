// src/lib/baserow/providers.ts
import "server-only";
import { extractLinkRowIds, normalizeField, toNumber } from "./utils";

export const PROVIDERS_TABLE_ID = Number(
  process.env.NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID,
);

type BaserowClientModule = typeof import("./client");
let baserowClientPromise: Promise<BaserowClientModule> | null = null;

const loadBaserowClient = () => {
  if (!baserowClientPromise) {
    baserowClientPromise = import("./client");
  }
  return baserowClientPromise;
};

type TruckTripHelpersModule = typeof import("./truckTrips");
let truckTripsHelpersPromise: Promise<TruckTripHelpersModule> | null = null;

const loadTruckTripHelpers = () => {
  if (!truckTripsHelpersPromise) {
    truckTripsHelpersPromise = import("./truckTrips");
  }
  return truckTripsHelpersPromise;
};

if (!PROVIDERS_TABLE_ID || Number.isNaN(PROVIDERS_TABLE_ID)) {
  throw new Error(
    "NEXT_PUBLIC_BASEROW_PROVIDERS_TABLE_ID is not a valid number in .env",
  );
}

export type ProviderRaw = {
  id: number;
  Nombre?: unknown;
  Notes?: unknown;
  Admite?:
    | Array<{
        id?: unknown;
        value?: unknown;
      }>
    | unknown;
  "Viajes de camión"?:
    | Array<{
        id?: unknown;
        value?: unknown;
      }>
    | unknown;
  "Kgs entregados"?: unknown;
  Periodo?: Array<{ value?: unknown }> | unknown;
  "Periodo viajes"?: Array<{ value?: unknown }> | unknown;
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

export type ProviderPeriodDto = {
  id: string;
  providerId: number;
  name: string;
  notes: string | null;
  admitsIds: number[];
  admitsLabels: string[];
  period: string;
  tripIds: number[];
  tripLabels: string[];
  deliveredKgs: number;
};

const extractLabels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        "value" in item &&
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
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return toNumber(value);
};

export function mapProviderRawToDto(row: ProviderRaw): ProviderDto {
  const label = normalizeField(row.Nombre) || `Proveedor #${row.id}`;
  const notes = normalizeField(row.Notes) || null;
  const admitsIds = extractLinkRowIds(row.Admite);
  const admitsLabels = extractLabels(row.Admite);
  const tripIds = extractLinkRowIds(row["Viajes de camión"]);
  const tripLabels = extractLabels(row["Viajes de camión"]);
  const deliveredKgs = parseNumber(row["Kgs entregados"]);
  const primaryPeriods = Array.from(new Set(extractLabels(row.Periodo)));
  const periodLabels = primaryPeriods.length
    ? primaryPeriods
    : Array.from(new Set(extractLabels(row["Periodo viajes"])));

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
    new Set(providers.flatMap((provider) => provider.tripIds)),
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

export async function getProviderPeriodRowsDto(): Promise<ProviderPeriodDto[]> {
  const { getTableRows } = await loadBaserowClient();
  const rows = await getTableRows<ProviderRaw>(PROVIDERS_TABLE_ID);
  const providers = rows.map(mapProviderRawToDto);

  const allTripIds = Array.from(
    new Set(providers.flatMap((provider) => provider.tripIds)),
  );

  let tripsById = new Map<
    number,
    { period: string; label: string; kgs: number }
  >();
  if (allTripIds.length) {
    const { getTruckTripsByIdsDto } = await loadTruckTripHelpers();
    const trips = await getTruckTripsByIdsDto(allTripIds);
    tripsById = new Map(
      trips.map((trip) => [
        trip.id,
        {
          period: trip.period || "—",
          label: trip.tripId || `#${trip.id}`,
          kgs: Number.isFinite(trip.totalKgsDestination)
            ? trip.totalKgsDestination
            : 0,
        },
      ]),
    );
  }

  const rowsByPeriod: ProviderPeriodDto[] = [];

  providers.forEach((provider) => {
    const groups = new Map<
      string,
      { tripIds: number[]; tripLabels: string[]; deliveredKgs: number }
    >();

    provider.tripIds.forEach((tripId) => {
      const trip = tripsById.get(tripId);
      if (!trip) return;
      const period = trip.period || "—";
      const group = groups.get(period) ?? {
        tripIds: [],
        tripLabels: [],
        deliveredKgs: 0,
      };
      group.tripIds.push(tripId);
      group.tripLabels.push(trip.label);
      group.deliveredKgs += trip.kgs || 0;
      groups.set(period, group);
    });

    if (!groups.size) {
      rowsByPeriod.push({
        id: `${provider.id}-no-period`,
        providerId: provider.id,
        name: provider.name,
        notes: provider.notes,
        admitsIds: provider.admitsIds,
        admitsLabels: provider.admitsLabels,
        period: "—",
        tripIds: [],
        tripLabels: [],
        deliveredKgs: 0,
      });
      return;
    }

    groups.forEach((group, period) => {
      rowsByPeriod.push({
        id: `${provider.id}-${period}`,
        providerId: provider.id,
        name: provider.name,
        notes: provider.notes,
        admitsIds: provider.admitsIds,
        admitsLabels: provider.admitsLabels,
        period,
        tripIds: group.tripIds,
        tripLabels: group.tripLabels,
        deliveredKgs: group.deliveredKgs,
      });
    });
  });

  return rowsByPeriod.sort(
    (a, b) => a.name.localeCompare(b.name) || a.period.localeCompare(b.period),
  );
}
