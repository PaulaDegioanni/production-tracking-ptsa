import { NextResponse } from 'next/server';

import { CYCLES_TABLE_ID, getCycleByIdDto } from '@/lib/baserow/cycles';
import { getHarvestsByCycleIdDto } from '@/lib/baserow/harvests';
import {
  BaserowRequestError,
  patchTableRow,
} from '@/lib/baserow/client';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid cycle id' }, { status: 400 });

const isValidDateValue = (value: unknown) =>
  typeof value === 'string' && DATE_REGEX.test(value);

export async function PATCH(request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const rowId = Number(idRaw);

  if (!idRaw || Number.isNaN(rowId) || rowId <= 0) {
    return invalidIdResponse();
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 },
      );
    }

    const hasFallow = Object.prototype.hasOwnProperty.call(
      body,
      'fallowStartDate'
    );
    const hasSowing = Object.prototype.hasOwnProperty.call(body, 'sowingDate');
    const hasEstimated = Object.prototype.hasOwnProperty.call(
      body,
      'estimatedHarvestDate'
    );

    if (!hasFallow && !hasSowing && !hasEstimated) {
      return NextResponse.json(
        { error: 'Payload vacío' },
        { status: 400 },
      );
    }

    const fallowStartDate = body.fallowStartDate as
      | string
      | null
      | undefined;
    const sowingDate = body.sowingDate as string | null | undefined;
    const estimatedHarvestDate = body.estimatedHarvestDate as
      | string
      | null
      | undefined;

    if (fallowStartDate !== null && fallowStartDate !== undefined) {
      if (!isValidDateValue(fallowStartDate)) {
        return NextResponse.json(
          { error: 'Fecha inicio barbecho inválida' },
          { status: 400 },
        );
      }
    }

    if (sowingDate !== null && sowingDate !== undefined) {
      if (!isValidDateValue(sowingDate)) {
        return NextResponse.json(
          { error: 'Fecha de siembra inválida' },
          { status: 400 },
        );
      }
    }

    if (estimatedHarvestDate !== null && estimatedHarvestDate !== undefined) {
      if (!isValidDateValue(estimatedHarvestDate)) {
        return NextResponse.json(
          { error: 'Fecha estimada de cosecha inválida' },
          { status: 400 },
        );
      }
    }

    if (hasEstimated) {
      const harvests = await getHarvestsByCycleIdDto(rowId);
      if (harvests.length > 0) {
        return NextResponse.json(
          {
            error:
              'Estimated harvest date cannot be edited because harvests exist.',
          },
          { status: 400 },
        );
      }
    }

    let cycleDates:
      | {
          fallowStartDate: string | null;
          sowingDate: string | null;
          estimatedHarvestDate: string | null;
        }
      | null = null;

    const needsOrderingCheck =
      (hasFallow && hasSowing) ||
      (hasSowing && hasEstimated) ||
      hasFallow ||
      hasSowing ||
      hasEstimated;

    if (needsOrderingCheck && (!hasFallow || !hasSowing || !hasEstimated)) {
      const cycle = await getCycleByIdDto(rowId);
      if (cycle) {
        cycleDates = {
          fallowStartDate: cycle.fallowStartDate ?? null,
          sowingDate: cycle.sowingDate ?? null,
          estimatedHarvestDate: cycle.estimatedHarvestDate ?? null,
        };
      }
    }

    const resolvedFallow =
      hasFallow && fallowStartDate !== undefined
        ? fallowStartDate
        : cycleDates?.fallowStartDate ?? null;
    const resolvedSowing =
      hasSowing && sowingDate !== undefined
        ? sowingDate
        : cycleDates?.sowingDate ?? null;
    const resolvedEstimated =
      hasEstimated && estimatedHarvestDate !== undefined
        ? estimatedHarvestDate
        : cycleDates?.estimatedHarvestDate ?? null;

    if (resolvedFallow && resolvedSowing && resolvedFallow > resolvedSowing) {
      return NextResponse.json(
        { error: 'La fecha de barbecho debe ser anterior o igual a la siembra' },
        { status: 400 },
      );
    }

    if (resolvedSowing && resolvedEstimated && resolvedSowing > resolvedEstimated) {
      return NextResponse.json(
        {
          error:
            'La fecha de siembra debe ser anterior o igual a la fecha estimada de cosecha',
        },
        { status: 400 },
      );
    }

    const payload: Record<string, any> = {};
    if (hasFallow) {
      payload['Fecha inicio barbecho'] = fallowStartDate ?? null;
    }
    if (hasSowing) {
      payload['Fecha de siembra'] = sowingDate ?? null;
    }
    if (hasEstimated) {
      payload['Fecha estimada de cosecha'] = estimatedHarvestDate ?? null;
    }

    await patchTableRow(CYCLES_TABLE_ID, rowId, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BaserowRequestError) {
      return NextResponse.json(
        { error: error.body || error.message },
        { status: error.status },
      );
    }

    console.error('Error al actualizar fechas del ciclo en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar las fechas del ciclo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
