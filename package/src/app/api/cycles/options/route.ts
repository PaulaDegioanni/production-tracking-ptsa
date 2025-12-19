import { NextRequest, NextResponse } from 'next/server';

import { getFieldsDto } from '@/lib/baserow/fields';
import { getLotsByFieldId } from '@/lib/baserow/lots';
import { getCycleSingleSelectOptions } from '@/lib/baserow/cycles';

export async function GET(request: NextRequest) {
  try {
    const campoIdParam = request.nextUrl.searchParams.get('campoId');

    if (campoIdParam) {
      const parsedCampoId = Number(campoIdParam);
      if (!parsedCampoId || Number.isNaN(parsedCampoId)) {
        return NextResponse.json(
          { error: 'campoId inválido. Debe ser un número.' },
          { status: 400 }
        );
      }

      const lots = await getLotsByFieldId(parsedCampoId);
      return NextResponse.json({ lots });
    }

    const [fields, selectOptions] = await Promise.all([
      getFieldsDto(),
      getCycleSingleSelectOptions(),
    ]);

    return NextResponse.json({
      fields: fields
        .map((field) => ({
          id: field.id,
          label: field.name || `Campo #${field.id}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      cropOptions: selectOptions.cropOptions,
      statusOptions: selectOptions.statusOptions,
      cropDefaultId: selectOptions.cropDefaultId,
      statusDefaultId: selectOptions.statusDefaultId,
    });
  } catch (error) {
    console.error('Error al cargar opciones de ciclos', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar opciones de ciclos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
