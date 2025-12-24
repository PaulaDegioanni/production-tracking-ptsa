import { NextResponse } from 'next/server';

import { getTruckSelectOptions } from '@/lib/baserow/truckFormOptions';

export async function GET() {
  try {
    const options = await getTruckSelectOptions();
    return NextResponse.json({ types: options.types });
  } catch (error) {
    console.error('Error al cargar opciones de camiones', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al obtener las opciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
