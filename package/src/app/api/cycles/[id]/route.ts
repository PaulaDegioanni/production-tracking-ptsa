import { NextResponse } from 'next/server';

import { getCycleByIdDto } from '@/lib/baserow/cycles';

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
    const cycle = await getCycleByIdDto(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Ciclo no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ cycle });
  } catch (error) {
    console.error('Error al cargar ciclo', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar el ciclo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
