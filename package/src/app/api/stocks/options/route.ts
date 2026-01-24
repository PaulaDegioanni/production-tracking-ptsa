import { NextRequest, NextResponse } from 'next/server';

import {
  getStockFieldDependencies,
  getStockFieldOptions,
  getStockSelectOptions,
} from '@/lib/baserow/stockFormOptions';

export async function GET(request: NextRequest) {
  try {
    const selectOnly = request.nextUrl.searchParams.get('select');
    const campoId = request.nextUrl.searchParams.get('campoId');
    const campoName = request.nextUrl.searchParams.get('campoName') ?? undefined;

    if (selectOnly === 'true') {
      const { unitTypes, statuses } = await getStockSelectOptions();
      return NextResponse.json({
        unitTypeOptions: unitTypes,
        statusOptions: statuses,
      });
    }

    if (!campoId) {
      const fields = await getStockFieldOptions();
      return NextResponse.json({ fields });
    }

    const parsedId = Number(campoId);
    if (!parsedId || Number.isNaN(parsedId)) {
      return NextResponse.json(
        { error: 'campoId inválido. Debe ser un número.' },
        { status: 400 }
      );
    }

    const dependencies = await getStockFieldDependencies({
      fieldId: parsedId,
      fieldName: campoName,
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('Error al cargar opciones de stock', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar opciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
