import { NextResponse } from 'next/server';

import { TRUCK_TRIPS_TABLE_ID } from '@/lib/baserow/truckTrips';
import { createTableRow } from '@/lib/baserow/rowsCrud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Payload inválido para crear un viaje de camión' },
        { status: 400 }
      );
    }

    const result = await createTableRow(TRUCK_TRIPS_TABLE_ID, payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al crear viaje de camión en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el viaje de camión';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
