// src/lib/baserow/client.ts

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
