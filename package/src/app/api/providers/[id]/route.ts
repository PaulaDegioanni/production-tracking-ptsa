import { NextResponse } from 'next/server';

import {
  PROVIDERS_TABLE_ID,
  mapProviderRawToDto,
} from '@/lib/baserow/providers';
import {
  BaserowRequestError,
  deleteTableRow,
  patchTableRow,
} from '@/lib/baserow/client';
import type { ProviderRaw } from '@/lib/baserow/providers';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

async function parseRowId(paramsPromise: RouteParams['params']) {
  const params = await paramsPromise;
  const id = params?.id;
  if (!id) return NaN;
  return Number(id);
}

function invalidIdResponse() {
  return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteParams) {
  const rowId = await parseRowId(context.params);

  if (Number.isNaN(rowId)) {
    return invalidIdResponse();
  }

  try {
    const body = await request.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const updatedRow = await patchTableRow<ProviderRaw>(
      PROVIDERS_TABLE_ID,
      rowId,
      payload as Record<string, any>
    );

    return NextResponse.json(mapProviderRawToDto(updatedRow));
  } catch (error) {
    if (error instanceof BaserowRequestError) {
      return NextResponse.json(
        { error: error.body || error.message },
        { status: error.status }
      );
    }

    console.error('Error al actualizar proveedor en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al actualizar el proveedor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteParams) {
  const rowId = await parseRowId(context.params);

  if (Number.isNaN(rowId)) {
    return invalidIdResponse();
  }

  try {
    await deleteTableRow(PROVIDERS_TABLE_ID, rowId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof BaserowRequestError) {
      return NextResponse.json(
        { error: error.body || error.message },
        { status: error.status }
      );
    }

    console.error('Error al eliminar proveedor en Baserow', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al eliminar el proveedor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
