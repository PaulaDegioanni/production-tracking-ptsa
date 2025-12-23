import { NextResponse } from 'next/server';

import {
  CYCLES_TABLE_ID,
  getCycleSingleSelectOptions,
  type CycleStatus,
} from '@/lib/baserow/cycles';
import {
  BaserowRequestError,
  patchTableRow,
} from '@/lib/baserow/client';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid cycle id' }, { status: 400 });

export async function PATCH(request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const rowId = Number(idRaw);

  if (!idRaw || Number.isNaN(rowId) || rowId <= 0) {
    return invalidIdResponse();
  }

  try {
    const body = await request.json();
    const status = body?.status as CycleStatus | undefined;
    if (!status) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 },
      );
    }

    const { statusOptions } = await getCycleSingleSelectOptions();
    const targetOption = statusOptions.find(
      (option) => slugify(option.value) === status,
    );

    if (!targetOption) {
      return NextResponse.json(
        { error: 'No pudimos encontrar la opción de estado solicitada' },
        { status: 400 },
      );
    }

    await patchTableRow(CYCLES_TABLE_ID, rowId, {
      Estado: targetOption.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof BaserowRequestError) {
      return NextResponse.json(
        { error: error.body || error.message },
        { status: error.status },
      );
    }

    console.error('Error al actualizar el estado del ciclo en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar el estado del ciclo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
