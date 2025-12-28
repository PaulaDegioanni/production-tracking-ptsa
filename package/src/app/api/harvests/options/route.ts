import { NextRequest, NextResponse } from 'next/server';

import {
  getHarvestFieldDependencies,
  getHarvestFieldOptions,
} from '@/lib/baserow/harvestFormOptions';
import { getServerSession } from '@/lib/auth/serverSession';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const campoId = request.nextUrl.searchParams.get('campoId');
    const campoName = request.nextUrl.searchParams.get('campoName') ?? undefined;

    if (!campoId) {
      const fields = await getHarvestFieldOptions();
      return NextResponse.json({ fields });
    }

    const parsedId = Number(campoId);
    if (!parsedId || Number.isNaN(parsedId)) {
      return NextResponse.json(
        { error: 'campoId inválido. Debe ser un número.' },
        { status: 400 }
      );
    }

    const dependencies = await getHarvestFieldDependencies({
      fieldId: parsedId,
      fieldName: campoName,
    });
    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('Error al cargar opciones de cosechas', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar opciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
