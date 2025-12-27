// src/lib/baserow/providerFormOptions.ts
import 'server-only';
import { getTableFields } from './client';
import { PROVIDERS_TABLE_ID } from './providers';

export type ProviderSelectOption = {
  id: string;
  label: string;
};

export async function getProviderSelectOptions(): Promise<{
  admits: ProviderSelectOption[];
}> {
  try {
    const fields = await getTableFields(PROVIDERS_TABLE_ID);
    const admitsField = fields.find(
      (field) => field.name === 'Admite' && field.type === 'multiple_select'
    );

    if (!admitsField?.select_options?.length) {
      console.warn(
        'Campo "Admite" sin opciones definidas en la tabla de proveedores'
      );
      return { admits: [] };
    }

    return {
      admits: admitsField.select_options.map((option) => ({
        id: String(option.id),
        label: String(option.value ?? '').trim(),
      })),
    };
  } catch (error) {
    console.error(
      'Error al obtener opciones de proveedores desde Baserow',
      error
    );
    return { admits: [] };
  }
}
