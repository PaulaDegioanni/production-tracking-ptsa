import { NextResponse } from 'next/server';

import { getStockByCycleIdDto } from '@/lib/baserow/stocks';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid cycle id' }, { status: 400 });

export async function GET(_request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const cycleId = Number(idRaw);

  if (!idRaw || Number.isNaN(cycleId) || cycleId <= 0) {
    return invalidIdResponse();
  }

  try {
    const stockUnits = await getStockByCycleIdDto(cycleId);
    return NextResponse.json({ stockUnits });
  } catch (error) {
    console.error('Error al cargar stock del ciclo', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
