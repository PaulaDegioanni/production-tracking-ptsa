import { NextResponse } from 'next/server';

import { CYCLES_TABLE_ID, getCycleByIdDto } from '@/lib/baserow/cycles';
import { BaserowRequestError, patchTableRow } from '@/lib/baserow/client';
import { getLotsByFieldIdDto, getLotsByIdsDto } from '@/lib/baserow/lots';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid cycle id' }, { status: 400 });

const normalizeLotIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
};

export async function PATCH(request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const rowId = Number(idRaw);

  if (!idRaw || Number.isNaN(rowId) || rowId <= 0) {
    return invalidIdResponse();
  }

  try {
    const body = await request.json();
    const lotIds = normalizeLotIds(body?.lotIds);

    if (!lotIds.length) {
      return NextResponse.json(
        { error: 'Seleccioná al menos un lote válido' },
        { status: 400 },
      );
    }

    const cycle = await getCycleByIdDto(rowId);
    if (!cycle) {
      return NextResponse.json(
        { error: 'Ciclo no encontrado' },
        { status: 404 },
      );
    }

    const fieldId = cycle.fieldId ?? null;
    if (fieldId !== null) {
      const fieldLots = await getLotsByFieldIdDto(fieldId);
      const allowedIds = new Set(fieldLots.map((lot) => lot.id));
      const invalid = lotIds.find((id) => !allowedIds.has(id));
      if (invalid !== undefined) {
        return NextResponse.json(
          { error: 'Hay lotes que no pertenecen al campo del ciclo' },
          { status: 400 },
        );
      }
    } else {
      const selectedLots = await getLotsByIdsDto(lotIds);
      const uniqueFieldIds = Array.from(
        new Set(selectedLots.map((lot) => lot.fieldId).filter(Boolean)),
      );
      if (uniqueFieldIds.length > 1) {
        return NextResponse.json(
          { error: 'Los lotes seleccionados deben pertenecer al mismo campo' },
          { status: 400 },
        );
      }
    }

    await patchTableRow(CYCLES_TABLE_ID, rowId, {
      Lotes: lotIds,
    });

    const updatedLots = await getLotsByIdsDto(lotIds);
    const inferredFieldId =
      fieldId ??
      updatedLots.find(
        (lot) => typeof lot.fieldId === 'number' && !Number.isNaN(lot.fieldId),
      )?.fieldId ??
      null;

    return NextResponse.json({
      cycle: { id: rowId, lotIds, fieldId: inferredFieldId },
      lots: updatedLots,
    });
  } catch (error) {
    if (error instanceof BaserowRequestError) {
      return NextResponse.json(
        { error: error.body || error.message },
        { status: error.status },
      );
    }

    console.error('Error al actualizar lotes del ciclo en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar lotes del ciclo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
