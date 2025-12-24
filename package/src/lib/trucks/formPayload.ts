// src/lib/trucks/formPayload.ts

type NormalizeOptions = {
  includeEmptyOptional?: boolean;
};

export function normalizeTruckFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: NormalizeOptions
): Record<string, any> {
  const payload: Record<string, any> = {};
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;

  const plate = String(formValues.Patente ?? '').trim();
  if (!plate) {
    throw new Error('Ingresá una patente válida');
  }
  payload.Patente = plate;

  const owner = String(formValues.Propietario ?? '').trim();
  if (!owner) {
    throw new Error('Ingresá un propietario válido');
  }
  payload.Propietario = owner;

  const typeRaw = formValues.Tipo;
  const typeId =
    typeRaw === '' || typeRaw === null || typeRaw === undefined
      ? NaN
      : Number(typeRaw);
  if (Number.isNaN(typeId) || typeId <= 0) {
    throw new Error('Seleccioná un tipo de camión válido');
  }
  payload.Tipo = typeId;

  return payload;
}
