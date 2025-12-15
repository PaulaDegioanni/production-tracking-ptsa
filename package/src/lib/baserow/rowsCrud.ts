'use server';

const BASEROW_URL = process.env.NEXT_PUBLIC_BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

if (!BASEROW_URL) {
  throw new Error('NEXT_PUBLIC_BASEROW_URL no está definido en el .env');
}

if (!BASEROW_TOKEN) {
  throw new Error('BASEROW_TOKEN no está definido en el .env');
}

export async function createTableRow<T>(
  tableId: number,
  payload: Record<string, any>
): Promise<T> {
  const url = `${BASEROW_URL}/api/database/rows/table/${tableId}/?user_field_names=true`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Error al crear fila en Baserow (tabla ${tableId}) [${response.status}]: ${
        errorBody || response.statusText
      }`
    );
  }

  return (await response.json()) as T;
}
