// src/lib/baserow/client.ts
import 'server-only';

const BASEROW_URL = process.env.NEXT_PUBLIC_BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

if (!BASEROW_URL) {
  throw new Error('NEXT_PUBLIC_BASEROW_URL no está definido en el .env');
}

if (!BASEROW_TOKEN) {
  throw new Error('BASEROW_TOKEN no está definido en el .env');
}

type BaserowResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export class BaserowRequestError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = 'BaserowRequestError';
  }
}

function buildTableUrl(
  tableId: number,
  params?: Record<string, string | number | boolean>
) {
  const url = new URL(`${BASEROW_URL}/api/database/rows/table/${tableId}/`);

  url.searchParams.set('user_field_names', 'true');

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function getTableRows<T>(
  tableId: number,
  params?: Record<string, string | number | boolean>
): Promise<T[]> {
  const url = buildTableUrl(tableId, params);

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('Error Baserow', res.status, await res.text());
    throw new Error(`Error al cargar filas desde Baserow (tabla ${tableId})`);
  }

  const data = (await res.json()) as BaserowResponse<T>;
  return data.results;
}

export async function getTableRowById<T>(
  tableId: number,
  rowId: number | string
): Promise<T> {
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('Error Baserow', res.status, await res.text());
    throw new Error(
      `Error al cargar fila ${rowId} desde Baserow (tabla ${tableId})`
    );
  }

  return (await res.json()) as T;
}

export async function patchTableRow<T>(
  tableId: number,
  rowId: number | string,
  payload: Record<string, any>
): Promise<T> {
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error Baserow', res.status, errorBody);
    throw new BaserowRequestError(
      `Error al actualizar fila ${rowId} desde Baserow (tabla ${tableId})`,
      res.status,
      errorBody || res.statusText
    );
  }

  return (await res.json()) as T;
}

export async function deleteTableRow(
  tableId: number,
  rowId: number | string
): Promise<void> {
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/${rowId}/`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error Baserow', res.status, errorBody);
    throw new BaserowRequestError(
      `Error al eliminar fila ${rowId} desde Baserow (tabla ${tableId})`,
      res.status,
      errorBody || res.statusText
    );
  }
}

// --- Table field metadata (schema) ---

export type BaserowTableField = {
  id: number;
  name: string;
  type: string;
  select_options?: {
    id: number;
    value: string;
    color?: string | null;
  }[];
  single_select_default?: number | null;
};

export async function getTableFields(
  tableId: number
): Promise<BaserowTableField[]> {
  const url = `${BASEROW_URL}/api/database/fields/table/${tableId}/`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('Error Baserow', res.status, await res.text());
    throw new Error(
      `Error al cargar definición de campos desde Baserow (tabla ${tableId})`
    );
  }

  return (await res.json()) as BaserowTableField[];
}
