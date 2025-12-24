// src/lib/baserow/truckFormOptions.ts
import { getTableFields } from './client';
import { TRUCKS_TABLE_ID } from './trucks';

export type TruckSelectOption = {
  id: string;
  label: string;
};

export async function getTruckSelectOptions(): Promise<{
  types: TruckSelectOption[];
}> {
  try {
    const fields = await getTableFields(TRUCKS_TABLE_ID);
    const typeField = fields.find(
      (field) => field.name === 'Tipo' && field.type === 'single_select'
    );

    if (!typeField?.select_options?.length) {
      console.warn(
        'Campo "Tipo" sin opciones definidas en la tabla de camiones'
      );
      return { types: [] };
    }

    return {
      types: typeField.select_options.map((option) => ({
        id: String(option.id),
        label: String(option.value ?? '').trim(),
      })),
    };
  } catch (error) {
    console.error(
      'Error al obtener opciones de camiones desde Baserow',
      error
    );
    return { types: [] };
  }
}
