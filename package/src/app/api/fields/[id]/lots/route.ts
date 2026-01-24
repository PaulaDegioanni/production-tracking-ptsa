import { NextResponse } from 'next/server';

import { getLotsByFieldIdDto } from '@/lib/baserow/lots';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid field id' }, { status: 400 });

export async function GET(_request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const fieldId = Number(idRaw);

  if (!idRaw || Number.isNaN(fieldId) || fieldId <= 0) {
    return invalidIdResponse();
  }

  try {
    const lots = await getLotsByFieldIdDto(fieldId);
    const payload = lots
      .map((lot) => ({
        id: lot.id,
        code: lot.code || `Lote #${lot.id}`,
        areaHa: lot.areaHa,
        fieldId: lot.fieldId ?? null,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ lots: payload });
  } catch (error) {
    console.error('Error al cargar lotes del campo', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar lotes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
