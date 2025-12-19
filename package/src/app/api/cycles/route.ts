import { NextResponse } from 'next/server';

import {
  createCycle,
  type CycleCreateValues,
} from '@/lib/baserow/cycles';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const values = body?.values as CycleCreateValues | undefined;

    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return NextResponse.json(
        { error: 'Valores inválidos para crear un ciclo' },
        { status: 400 }
      );
    }

    const created = await createCycle(values);
    return NextResponse.json(created);
  } catch (error) {
    console.error('Error al crear ciclo en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al crear el ciclo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
