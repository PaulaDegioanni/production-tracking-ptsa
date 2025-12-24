import { NextResponse } from 'next/server';

import {
  createField,
  updateField,
  deleteField,
  type FieldCreatePayload,
} from '@/lib/baserow/fields';
import { createLot, deleteLot } from '@/lib/baserow/lots';
import type { FieldFormSubmitPayload } from '@/lib/fields/formTypes';

const normalizeFieldPayload = (
  payload: FieldFormSubmitPayload
): FieldCreatePayload => ({
  name: payload.name.trim(),
  totalAreaHa: payload.totalAreaHa,
  location: payload.location?.trim() ?? '',
  isRented: Boolean(payload.isRented),
  notes: payload.notes?.trim() ?? '',
});

export async function POST(request: Request) {
  let createdFieldId: number | null = null;
  const createdLotIds: number[] = [];

  try {
    const body = await request.json();
    const payload = body?.payload as FieldFormSubmitPayload | undefined;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload inválido para crear un campo' },
        { status: 400 }
      );
    }

    if (!payload.name || !payload.name.trim()) {
      return NextResponse.json(
        { error: 'Ingresá un nombre válido para el campo' },
        { status: 400 }
      );
    }

    if (
      typeof payload.totalAreaHa !== 'number' ||
      Number.isNaN(payload.totalAreaHa) ||
      payload.totalAreaHa <= 0
    ) {
      return NextResponse.json(
        { error: 'Ingresá una superficie total válida' },
        { status: 400 }
      );
    }

    const lots = Array.isArray(payload.lots) ? payload.lots : [];

    const normalizedLots = lots.map((lot, index) => {
      const code = String(lot.code ?? '').trim();
      const area = Number(lot.areaHa);
      return {
        id: lot.id && Number(lot.id) > 0 ? Number(lot.id) : undefined,
        code,
        areaHa: area,
        clientIndex: index,
      };
    });

    const invalidLot = normalizedLots.find(
      (lot) => !lot.code || !Number.isFinite(lot.areaHa) || lot.areaHa <= 0
    );

    if (invalidLot) {
      return NextResponse.json(
        {
          error: 'Todos los lotes deben tener un código y superficie válida',
          meta: { lotIndex: invalidLot.clientIndex },
        },
        { status: 400 }
      );
    }

    const fieldPayload = normalizeFieldPayload(payload);
    const createdField = await createField(fieldPayload);
    createdFieldId = createdField.id;

    const createdLots = [];
    for (const lot of normalizedLots) {
      const createdLot = await createLot({
        code: lot.code,
        areaHa: lot.areaHa,
        fieldId: createdField.id,
      });
      createdLotIds.push(createdLot.id);
      createdLots.push(createdLot);
    }

    if (createdLotIds.length) {
      await updateField(createdField.id, { lotIds: createdLotIds });
    }

    return NextResponse.json(
      {
        field: createdField,
        lots: createdLots,
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdLotIds.length) {
      await Promise.allSettled(createdLotIds.map((id) => deleteLot(id)));
    }
    if (createdFieldId) {
      try {
        await deleteField(createdFieldId);
      } catch (cleanupError) {
        console.error('Error al limpiar campo creado parcialmente', cleanupError);
      }
    }

    console.error('Error al crear campo en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el campo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
