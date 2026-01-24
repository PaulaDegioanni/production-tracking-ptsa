import { combineDateAndTimeToIso } from "@/lib/forms/datetime";

export function normalizeHarvestFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean },
): Record<string, any> {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;

  const payload: Record<string, any> = {
    Fecha: combineDateAndTimeToIso(
      formValues["Fecha_fecha"],
      formValues["Fecha_hora"],
    ),
  };

  const rawKgs = formValues["KG Cosechados"];
  const harvestedKgs = parseFloat(rawKgs);
  if (Number.isNaN(harvestedKgs)) {
    throw new Error("Ingresá un número válido para los kilos cosechados");
  }
  payload["KG Cosechados"] = harvestedKgs;

  const lotsValue = Array.isArray(formValues.Lotes) ? formValues.Lotes : [];
  const lotIds = lotsValue
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  if (!lotIds.length) {
    throw new Error("Seleccioná al menos un lote");
  }
  payload.Lotes = lotIds;

  const cycleValue = formValues["Ciclo de siembra"];
  const cycleId = Number(cycleValue);
  if (!cycleId || Number.isNaN(cycleId)) {
    throw new Error("Seleccioná un ciclo de siembra válido");
  }
  payload["Ciclo de siembra"] = [cycleId];

  const stockValue = formValues.Stock;
  const stockId = Number(stockValue);
  if (stockValue && stockId && !Number.isNaN(stockId)) {
    payload.Stock = [stockId];
  } else if (includeEmptyOptional) {
    payload.Stock = [];
  }

  const tripValue = formValues["Viajes camión directos"];
  const tripId = Number(tripValue);
  if (tripValue && tripId && !Number.isNaN(tripId)) {
    payload["Viajes camión directos"] = [tripId];
  } else if (includeEmptyOptional) {
    payload["Viajes camión directos"] = [];
  }

  const notesValue = (formValues["Notas"] ?? "").trim();
  if (notesValue || includeEmptyOptional) {
    payload.Notas = notesValue;
  }

  return payload;
}
