// src/lib/baserow/stockFormOptions.ts
import 'server-only';
import { getFieldsDto } from './fields';
import { getTableFields } from './client';
import { STOCK_TABLE_ID } from './stocks';
import { getCyclesDto } from './cycles';

export type Option = {
  id: number;
  label: string;
};

export type CycleOption = Option & {
  crop: string;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export async function getStockFieldOptions(): Promise<Option[]> {
  const fields = await getFieldsDto();
  return fields
    .map((field) => ({
      id: field.id,
      label: field.name || `Campo #${field.id}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getStockSelectOptions(): Promise<{
  unitTypes: Option[];
  statuses: Option[];
}> {
  const fields = await getTableFields(STOCK_TABLE_ID);

  const unitTypeField = fields.find((f) => f.name === 'Tipo unidad');
  const statusField = fields.find((f) => f.name === 'Estado');

  if (!unitTypeField?.select_options) {
    throw new Error('Campo "Tipo unidad" sin opciones');
  }

  if (!statusField?.select_options) {
    throw new Error('Campo "Estado" sin opciones');
  }

  return {
    unitTypes: unitTypeField.select_options.map((o) => ({
      id: o.id,
      label: o.value,
    })),
    statuses: statusField.select_options.map((o) => ({
      id: o.id,
      label: o.value,
    })),
  };
}

export async function getStockFieldDependencies(params: {
  fieldId: number;
  fieldName?: string;
}): Promise<{
  cycles: CycleOption[];
}> {
  const { fieldId, fieldName } = params;
  const normalizedFieldName = fieldName ? normalize(fieldName) : '';

  const cycles = await getCyclesDto();

  const matchesField = (candidate: {
    fieldId?: number | null;
    fieldName?: string;
  }): boolean => {
    if (candidate.fieldId && candidate.fieldId === fieldId) return true;
    if (!normalizedFieldName) return false;
    if (!candidate.fieldName) return false;
    return normalize(candidate.fieldName) === normalizedFieldName;
  };

  const cycleOptions = cycles
    .filter((cycle) =>
      matchesField({ fieldId: cycle.fieldId, fieldName: cycle.field })
    )
    .map((cycle) => {
      const orderDate =
        cycle.harvestStartDate ||
        cycle.estimatedHarvestDate ||
        cycle.sowingDate ||
        null;

      return {
        option: {
          id: cycle.id,
          label: cycle.cycleId
            ? `${cycle.cycleId} · ${cycle.crop || 'Sin cultivo'}`
            : cycle.crop || `Ciclo #${cycle.id}`,
          crop: cycle.crop,
        },
        orderDate,
      };
    })
    .sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      if (dateA === dateB) return b.option.id - a.option.id;
      return dateB - dateA;
    })
    .map((item) => item.option);

  return { cycles: cycleOptions };
}
