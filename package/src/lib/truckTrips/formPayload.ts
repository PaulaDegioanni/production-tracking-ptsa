// src/lib/truckTrips/formPayload.ts
import { combineDateAndTimeToIso } from '@/lib/forms/datetime';
import type { TruckTripDto } from '@/lib/baserow/truckTrips';

type NormalizeOptions = {
  includeEmptyOptional?: boolean;
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? NaN : parsed;
};

export function normalizeTruckTripFormToBaserowPayload(
  formValues: Record<string, any>,
  options?: NormalizeOptions
): Record<string, any> {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;
  const payload: Record<string, any> = {};

  const truckId = Number(formValues['Camión']);
  if (!truckId || Number.isNaN(truckId)) {
    throw new Error('Seleccioná un camión válido');
  }
  payload['Camión'] = [truckId];

  const datePart = String(formValues['Fecha de salida - Fecha'] ?? '').trim();
  const timePart = String(formValues['Fecha de salida - Hora'] ?? '').trim();
  payload['Fecha de salida'] = combineDateAndTimeToIso(datePart, timePart);

  const statusId = Number(formValues['Estado']);
  if (!statusId || Number.isNaN(statusId)) {
    throw new Error('Seleccioná un estado válido');
  }
  payload.Estado = statusId;

  const originTypeRaw = String(formValues['Tipo origen'] ?? '').trim();
  const originId = Number(formValues['Origen']);
  if (!originId || Number.isNaN(originId)) {
    throw new Error('Seleccioná un origen válido');
  }

  const normalizedOriginType = originTypeRaw.toLowerCase();

  if (normalizedOriginType === 'cosecha' || normalizedOriginType === 'harvest') {
    payload['Cosecha Origen (opcional)'] = [originId];
    payload['Stock Origen (opcional)'] = [];
  } else if (normalizedOriginType === 'stock') {
    payload['Stock Origen (opcional)'] = [originId];
    payload['Cosecha Origen (opcional)'] = [];
  } else {
    throw new Error('Seleccioná un tipo de origen válido');
  }

  const originKgs = normalizeNumber(formValues['Kg carga origen']);
  if (Number.isNaN(originKgs)) {
    throw new Error('Ingresá un número válido para los kgs de origen');
  }
  payload['Kg carga origen'] = originKgs;

  const destinationRaw = String(formValues['Kg carga destino'] ?? '').trim();
  if (destinationRaw) {
    const destinationKgs = normalizeNumber(formValues['Kg carga destino']);
    if (Number.isNaN(destinationKgs)) {
      throw new Error('Ingresá un número válido para los kgs de destino');
    }
    payload['Kg carga destino'] = destinationKgs;
  } else if (includeEmptyOptional) {
    payload['Kg carga destino'] = null;
  }

  const ctgRaw = String(formValues['CTG'] ?? '').trim();
  if (ctgRaw) {
    const ctgValue = Number(ctgRaw);
    if (Number.isNaN(ctgValue)) {
      throw new Error('Ingresá un número válido para el CTG');
    }
    payload['CTG'] = ctgValue;
  } else if (includeEmptyOptional) {
    payload['CTG'] = null;
  }

  const destinationType = Number(formValues['Tipo destino']);
  if (destinationType && !Number.isNaN(destinationType)) {
    payload['Tipo destino'] = destinationType;
  } else if (includeEmptyOptional) {
    payload['Tipo destino'] = null;
  }

  const providerValue = Number(formValues['Proveedor']);
  if (providerValue && !Number.isNaN(providerValue)) {
    payload['Proveedor'] = [providerValue];
  } else if (includeEmptyOptional) {
    payload['Proveedor'] = [];
  }

  const destinationDetail = String(
    formValues['Detalle Destino'] ?? formValues['Detalle Destino (opcional)'] ?? ''
  ).trim();
  if (destinationDetail || includeEmptyOptional) {
    payload['Detalle Destino (opcional)'] = destinationDetail;
  }

  const notes = String(formValues['Notas'] ?? '').trim();
  if (notes || includeEmptyOptional) {
    payload.Notas = notes;
  }

  return payload;
}

export function normalizeTruckTripDtoToBaserowPayload(
  trip: TruckTripDto
): Record<string, any> {
  const payload: Record<string, any> = {};

  payload['Camión'] = trip.truckId ? [trip.truckId] : [];

  payload['Fecha de salida'] = trip.date ?? null;

  payload['CTG'] = trip.ctg > 0 ? trip.ctg : null;

  payload.Estado = trip.statusId ?? null;

  payload['Tipo destino'] = trip.destinationTypeId ?? null;

  payload['Detalle Destino (opcional)'] = trip.destinationDetail ?? '';
  payload['Kg carga origen'] = trip.totalKgsOrigin ?? 0;
  payload['Kg carga destino'] = trip.totalKgsDestination ?? 0;
  payload.Notas = trip.notes ?? '';

  payload['Cosecha Origen (opcional)'] = trip.harvestOriginIds.length
    ? [trip.harvestOriginIds[0]]
    : [];
  payload['Stock Origen (opcional)'] = trip.stockOriginIds.length
    ? [trip.stockOriginIds[0]]
    : [];

  payload['Proveedor'] = trip.providerIds?.length ? trip.providerIds : [];

  return payload;
}
