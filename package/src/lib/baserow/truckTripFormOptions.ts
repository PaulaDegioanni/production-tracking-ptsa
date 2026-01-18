// src/lib/baserow/truckTripFormOptions.ts
import 'server-only';
import { getTableFields } from './client';
import { getFieldsDto } from './fields';
import { getHarvestsDto, HarvestDto } from './harvests';
import { getProvidersDto } from './providers';
import { getStockDto, StockDto } from './stocks';
import { getTrucksDto } from './trucks';
import { TRUCK_TRIPS_TABLE_ID } from './truckTrips';
import { IdLabelOption, mapSelectOptions } from './utils';
import { getCycleRowIdByLabel } from './cycles';
import { normalizeFieldLabel } from '@/lib/fields/fieldMatching';

export type TruckTripOriginType = 'harvest' | 'stock';

export type TruckTripSelectOptions = {
  destinationTypes: IdLabelOption[];
  statuses: IdLabelOption[];
  trucks: IdLabelOption[];
  providers: IdLabelOption[];
  fields: IdLabelOption[];
};

export type TruckTripOriginOption = {
  id: number;
  label: string;
  meta: {
    cycleLabel: string | null;
    cycleRowId: number | null;
  };
};

const mapTruckOption = (truck: { id: number; plate: string }): IdLabelOption => ({
  id: truck.id,
  label: truck.plate,
});

const mapProviderOption = (provider: { id: number; name: string }): IdLabelOption => ({
  id: provider.id,
  label: provider.name,
});

const mapFieldOption = (field: { id: number; name: string }): IdLabelOption => ({
  id: field.id,
  label: field.name || `Campo #${field.id}`,
});

function matchesField(
  candidate: { fieldId?: number | null; fieldName?: string | null },
  filter: { fieldId?: number; normalizedFieldName?: string }
): boolean {
  const { fieldId, normalizedFieldName } = filter;
  if (fieldId && candidate.fieldId && fieldId === candidate.fieldId) {
    return true;
  }
  if (normalizedFieldName && candidate.fieldName) {
    return normalizeFieldLabel(candidate.fieldName) === normalizedFieldName;
  }
  return false;
}

const mapHarvestToOrigin = (harvest: HarvestDto): TruckTripOriginOption => ({
  id: harvest.id,
  label: harvest.harvestId || `Cosecha #${harvest.id}`,
  meta: {
    cycleLabel: harvest.cycleLabel ?? null,
    cycleRowId: harvest.cycleId ?? null,
  },
});

const mapStockToOrigin = (stock: StockDto): TruckTripOriginOption => ({
  id: stock.id,
  label: stock.stockId || `Stock #${stock.id}`,
  meta: {
    cycleLabel: stock.cycleLabels?.[0] ?? null,
    cycleRowId: stock.cycleIds?.[0] ?? null,
  },
});

async function hydrateCycleRowIds(
  origins: TruckTripOriginOption[]
): Promise<TruckTripOriginOption[]> {
  return Promise.all(
    origins.map(async (origin) => {
      const hasId =
        typeof origin.meta.cycleRowId === 'number' &&
        !Number.isNaN(origin.meta.cycleRowId);
      if (hasId || !origin.meta.cycleLabel) {
        return origin;
      }

      const resolvedId = await getCycleRowIdByLabel(origin.meta.cycleLabel);
      return {
        ...origin,
        meta: {
          ...origin.meta,
          cycleRowId: resolvedId,
        },
      };
    })
  );
}

export async function getTruckTripSelectOptions(): Promise<TruckTripSelectOptions> {
  const [tableFields, trucks, providers, fields] = await Promise.all([
    getTableFields(TRUCK_TRIPS_TABLE_ID),
    getTrucksDto(),
    getProvidersDto(),
    getFieldsDto(),
  ]);

  const destinationTypeField = tableFields.find(
    (field) => field.name === 'Tipo destino' && field.type === 'single_select'
  );

  const statusField = tableFields.find(
    (field) => field.name === 'Estado' && field.type === 'single_select'
  );

  return {
    destinationTypes: mapSelectOptions(destinationTypeField?.select_options),
    statuses: mapSelectOptions(statusField?.select_options),
    trucks: trucks.map(mapTruckOption),
    providers: providers.map(mapProviderOption),
    fields: fields.map(mapFieldOption).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export async function getTruckTripOriginOptions(params: {
  originType: TruckTripOriginType;
  fieldId?: number;
  fieldName?: string;
}): Promise<{ origins: TruckTripOriginOption[] }> {
  const { originType, fieldId, fieldName } = params;
  const normalizedFieldName = fieldName
    ? normalizeFieldLabel(fieldName)
    : undefined;

  const fieldFilter =
    fieldId || normalizedFieldName
      ? { fieldId, normalizedFieldName }
      : undefined;

  if (originType === 'harvest') {
    const harvests = await getHarvestsDto();
    const filtered = harvests.filter((harvest) => {
      if (!fieldFilter) return true;
      return matchesField(
        { fieldId: harvest.fieldId, fieldName: harvest.field },
        fieldFilter
      );
    });

    const mapped = filtered.map(mapHarvestToOrigin).sort((a, b) => b.id - a.id);
    return {
      origins: await hydrateCycleRowIds(mapped),
    };
  }

  const stocks = await getStockDto();
  const filtered = stocks.filter((stock) => {
    if (!fieldFilter) return true;
    return matchesField({ fieldId: stock.fieldId, fieldName: stock.field }, fieldFilter);
  });

  const mapped = filtered.map(mapStockToOrigin).sort((a, b) => b.id - a.id);
  return {
    origins: await hydrateCycleRowIds(mapped),
  };
}

export async function getTruckTripOriginById(params: {
  originType: TruckTripOriginType;
  originId: number;
}): Promise<TruckTripOriginOption | undefined> {
  const { originType, originId } = params;

  if (originType === 'harvest') {
    const harvests = await getHarvestsDto();
    const harvest = harvests.find((item) => item.id === originId);
    if (!harvest) return undefined;
    const [origin] = await hydrateCycleRowIds([mapHarvestToOrigin(harvest)]);
    return origin;
  }

  const stocks = await getStockDto();
  const stock = stocks.find((item) => item.id === originId);
  if (!stock) return undefined;
  const [origin] = await hydrateCycleRowIds([mapStockToOrigin(stock)]);
  return origin;
}
