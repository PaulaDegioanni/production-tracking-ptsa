import { NextResponse } from 'next/server';

import { STOCK_TABLE_ID } from '@/lib/baserow/stocks';
import { createTableRow } from '@/lib/baserow/rowsCrud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload inválido para crear un stock' },
        { status: 400 }
      );
    }

    const result = await createTableRow(STOCK_TABLE_ID, payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al crear stock en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
