// src/lib/stocks/formPayload.ts

export function normalizeStockFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean }
): Record<string, any> {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;
  const payload: Record<string, any> = {};

  const unitTypeValue = Number(formValues['Tipo unidad']);
  if (!unitTypeValue || Number.isNaN(unitTypeValue)) {
    throw new Error('Seleccioná un tipo de unidad válido');
  }
  payload['Tipo unidad'] = unitTypeValue;

  const cycleRaw = formValues['Ciclo de siembra'];
  const cycleValue =
    cycleRaw === '' || cycleRaw === null || cycleRaw === undefined
      ? null
      : Number(cycleRaw);
  if (cycleValue && !Number.isNaN(cycleValue)) {
    payload['Ciclo de siembra'] = [cycleValue];
  } else if (includeEmptyOptional) {
    payload['Ciclo de siembra'] = [];
  }

  const creationDate = String(formValues['Fecha de creación'] ?? '').trim();
  if (!creationDate) {
    throw new Error('Ingresá una fecha de creación válida (YYYY-MM-DD)');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(creationDate)) {
    throw new Error('Ingresá una fecha de creación válida (YYYY-MM-DD)');
  }
  payload['Fecha de creación'] = creationDate;

  const statusValue = Number(formValues['Estado']);
  if (!statusValue || Number.isNaN(statusValue)) {
    throw new Error('Seleccioná un estado válido');
  }
  payload.Estado = statusValue;

  const notesValue = (formValues['Notas'] ?? '').trim();
  if (notesValue || includeEmptyOptional) {
    payload.Notas = notesValue;
  }

  return payload;
}
