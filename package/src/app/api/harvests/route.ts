import { NextResponse } from 'next/server';

import { HARVESTS_TABLE_ID } from '@/lib/baserow/harvests';
import { createTableRow } from '@/lib/baserow/rowsCrud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Payload inválido para crear una cosecha' },
        { status: 400 }
      );
    }

    const result = await createTableRow(HARVESTS_TABLE_ID, payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al crear cosecha en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear la cosecha';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
