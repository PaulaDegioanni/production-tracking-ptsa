import { NextResponse } from 'next/server';

import {
  updateField,
  deleteField,
  type FieldUpdatePayload,
} from '@/lib/baserow/fields';
import {
  createLot,
  updateLot,
  deleteLot,
  getLotsByFieldIdDto,
} from '@/lib/baserow/lots';
import type { FieldFormSubmitPayload } from '@/lib/fields/formTypes';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const parseFieldId = async (
  paramsPromise: RouteParams['params']
): Promise<number> => {
  const params = await paramsPromise;
  const rawId = params?.id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export async function PATCH(request: Request, context: RouteParams) {
  const fieldId = await parseFieldId(context.params);
  if (!fieldId || Number.isNaN(fieldId)) {
    return NextResponse.json({ error: 'ID de campo inválido' }, { status: 400 });
  }

  const createdLotIds: number[] = [];

  try {
    const body = await request.json();
    const payload = body?.payload as FieldFormSubmitPayload | undefined;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload inválido para actualizar el campo' },
        { status: 400 }
      );
    }

    const trimmedName = (payload.name ?? '').trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Ingresá un nombre válido para el campo' },
        { status: 400 }
      );
    }

    const area = Number(payload.totalAreaHa);
    if (!Number.isFinite(area) || area <= 0) {
      return NextResponse.json(
        { error: 'Ingresá una superficie total válida' },
        { status: 400 }
      );
    }

    const normalizedLots = Array.isArray(payload.lots)
      ? payload.lots.map((lot, index) => {
          const code = String(lot?.code ?? '').trim();
          const lotArea = Number(lot?.areaHa);
          return {
            id:
              lot?.id && Number(lot.id) > 0
                ? Number(lot.id)
                : undefined,
            code,
            areaHa: lotArea,
            index,
          };
        })
      : [];

    const invalidLot = normalizedLots.find(
      (lot) => !lot.code || !Number.isFinite(lot.areaHa) || lot.areaHa <= 0
    );

    if (invalidLot) {
      return NextResponse.json(
        {
          error: 'Todos los lotes deben tener código y superficie válida',
          meta: { lotIndex: invalidLot.index },
        },
        { status: 400 }
      );
    }

    const fieldUpdatePayload: FieldUpdatePayload = {
      name: trimmedName,
      totalAreaHa: area,
      location: String(payload.location ?? '').trim(),
      notes: String(payload.notes ?? '').trim(),
      isRented: Boolean(payload.isRented),
    };

    await updateField(fieldId, fieldUpdatePayload);

    await updateField(fieldId, fieldUpdatePayload);

    const currentLots = await getLotsByFieldIdDto(fieldId);
    const currentLotMap = new Map(currentLots.map((lot) => [lot.id, lot]));

    const desiredLotIds = normalizedLots
      .map((lot) => lot.id)
      .filter((id): id is number => Boolean(id));

    const lotsToDelete = currentLots
      .filter((lot) => !desiredLotIds.includes(lot.id))
      .map((lot) => lot.id);

    if (lotsToDelete.length) {
      await Promise.all(lotsToDelete.map((lotId) => deleteLot(lotId)));
    }

    const finalLotIds: number[] = [];

    for (const lot of normalizedLots) {
      const trimmedCode = lot.code;
      const lotArea = lot.areaHa;

      if (lot.id) {
        const current = currentLotMap.get(lot.id);
        const currentCode = (current?.code ?? '').trim();
        const currentArea = Number(current?.areaHa ?? 0);
        const needsUpdate =
          !current ||
          currentCode !== trimmedCode ||
          currentArea !== Number(lotArea);

        if (needsUpdate) {
          await updateLot(lot.id, {
            code: trimmedCode,
            areaHa: lotArea,
            fieldId,
          });
        }
        finalLotIds.push(lot.id);
      } else {
        const created = await createLot({
          code: trimmedCode,
          areaHa: lotArea,
          fieldId,
        });
        createdLotIds.push(created.id);
        finalLotIds.push(created.id);
      }
    }

    if (finalLotIds.length || lotsToDelete.length || createdLotIds.length) {
      await updateField(fieldId, { lotIds: finalLotIds });
    }

    return NextResponse.json({
      id: fieldId,
      lotIds: finalLotIds,
    });
  } catch (error) {
    if (createdLotIds.length) {
      await Promise.allSettled(createdLotIds.map((lotId) => deleteLot(lotId)));
    }

    console.error('Error al actualizar campo', fieldId, error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar el campo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteParams
) {
  const fieldId = await parseFieldId(context.params);
  if (!fieldId || Number.isNaN(fieldId)) {
    return NextResponse.json({ error: 'ID de campo inválido' }, { status: 400 });
  }

  try {
    const lots = await getLotsByFieldIdDto(fieldId);
    if (lots.length) {
      await Promise.all(lots.map((lot) => deleteLot(lot.id)));
    }

    await deleteField(fieldId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error al borrar campo', fieldId, error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al borrar el campo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
