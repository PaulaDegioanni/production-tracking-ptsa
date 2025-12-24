import { NextResponse } from 'next/server';

import { TRUCKS_TABLE_ID } from '@/lib/baserow/trucks';
import { createTableRow } from '@/lib/baserow/rowsCrud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload inválido para crear un camión' },
        { status: 400 }
      );
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: 'Payload vacío para crear un camión' },
        { status: 400 }
      );
    }

    const result = await createTableRow(TRUCKS_TABLE_ID, payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al crear camión en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el camión';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
