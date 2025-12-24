import { NextResponse } from 'next/server';

import { getProviderSelectOptions } from '@/lib/baserow/providerFormOptions';

export async function GET() {
  try {
    const options = await getProviderSelectOptions();
    return NextResponse.json({ admits: options.admits });
  } catch (error) {
    console.error('Error al obtener opciones de proveedores', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al obtener las opciones';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
