// src/lib/baserow.ts
const BASEROW_URL = process.env.NEXT_PUBLIC_BASEROW_URL!;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN!;
const CYCLES_TABLE_ID = process.env.NEXT_PUBLIC_BASEROW_CYCLES_TABLE_ID!;

type BaserowResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Ciclo = {
  id: number;
  ID: string; // campo fórmula "ID"
  Campo?: string;
  Cultivo?: { id: number; value: string; color: string } | null;
  Estado?: { id: number; value: string; color: string } | null;
  "Kgs en Stock"?: number;
  "Kgs Cami\u00f3n desde Stock"?: number;
  "Fecha de siembra"?: string;
  "Fecha estimada de cosecha"?: string;
};

export async function getCiclos(): Promise<Ciclo[]> {
  const url = `${BASEROW_URL}/api/database/rows/table/${CYCLES_TABLE_ID}/?user_field_names=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
    // como es un panel de datos, mejor sin cache
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Error Baserow", res.status, await res.text());
    throw new Error("Error al cargar ciclos desde Baserow");
  }

  const data = (await res.json()) as BaserowResponse<Ciclo>;
  return data.results;
}
