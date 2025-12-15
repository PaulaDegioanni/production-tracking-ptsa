// src/lib/baserow/harvestFormOptions.ts
import { getFieldsDto } from './fields';
import { getLotsDto } from './lots';
import { getCyclesDto } from './cycles';
import { getStockDto } from './stock';
import { getTruckTripsDto } from './truckTrips';

export type BasicOption = {
  id: number;
  label: string;
};

export type CycleOption = BasicOption & {
  crop: string;
  orderDate: string | null;
};

export type HarvestFieldOptionsResponse = {
  fields: BasicOption[];
};

export type HarvestFieldDependenciesResponse = {
  lots: BasicOption[];
  cycles: CycleOption[];
  stocks: BasicOption[];
  truckTrips: BasicOption[];
};

const normalize = (value: string): string => value.trim().toLowerCase();

export async function getHarvestFieldOptions(): Promise<BasicOption[]> {
  const fields = await getFieldsDto();
  return fields
    .map((field) => ({
      id: field.id,
      label: field.name || `Campo #${field.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getHarvestFieldDependencies(params: {
  fieldId: number;
  fieldName?: string;
}): Promise<HarvestFieldDependenciesResponse> {
  const { fieldId, fieldName } = params;
  const normalizedFieldName = fieldName ? normalize(fieldName) : '';

  const [lots, cycles, stocks, trips] = await Promise.all([
    getLotsDto(),
    getCyclesDto(),
    getStockDto(),
    getTruckTripsDto(),
  ]);

  const matchesField = (candidate: {
    fieldId?: number | null;
    fieldName?: string;
  }): boolean => {
    if (candidate.fieldId && candidate.fieldId === fieldId) return true;
    if (!normalizedFieldName) return false;
    if (!candidate.fieldName) return false;
    return normalize(candidate.fieldName) === normalizedFieldName;
  };

  const lotOptions = lots
    .filter((lot) =>
      matchesField({ fieldId: lot.fieldId, fieldName: lot.fieldName })
    )
    .map((lot) => ({
      id: lot.id,
      label: lot.code || `Lote #${lot.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cycleOptions = cycles
    .filter((cycle) =>
      matchesField({ fieldId: cycle.fieldId, fieldName: cycle.field })
    )
    .map<CycleOption>((cycle) => ({
      id: cycle.id,
      label: cycle.cycleId
        ? `${cycle.cycleId} · ${cycle.crop || 'Sin cultivo'}`
        : cycle.crop || `Ciclo #${cycle.id}`,
      crop: cycle.crop,
      orderDate:
        cycle.harvestStartDate ||
        cycle.estimatedHarvestDate ||
        cycle.sowingDate ||
        null,
    }))
    .sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      if (dateA === dateB) return b.id - a.id;
      return dateB - dateA;
    });

  const stockOptions = stocks
    .filter((stock) =>
      matchesField({ fieldId: stock.fieldId, fieldName: stock.field })
    )
    .map((stock) => ({
      id: stock.id,
      label: stock.name || `Stock #${stock.id}`,
    }))
    .sort((a, b) => b.id - a.id);

  const truckTripOptions = trips
    .filter((trip) => {
      if (!normalizedFieldName) return false;
      const origin =
        trip.originField ||
        trip.originFieldFromHarvest ||
        trip.originFieldFromStock ||
        '';
      return normalize(origin) === normalizedFieldName;
    })
    .map((trip) => ({
      id: trip.id,
      label: trip.tripId || `Viaje #${trip.id}`,
    }))
    .sort((a, b) => b.id - a.id);

  return {
    lots: lotOptions,
    cycles: cycleOptions,
    stocks: stockOptions,
    truckTrips: truckTripOptions,
  };
}
