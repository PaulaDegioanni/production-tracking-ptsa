import { NextRequest, NextResponse } from "next/server";

import { getHarvestAvailableKgs } from "@/lib/baserow/harvests";
import { getStockAvailableKgs } from "@/lib/baserow/stocks";

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get("type");
    const idParam = request.nextUrl.searchParams.get("id");

    const normalizedType = typeParam?.toLowerCase();
    if (normalizedType !== "harvest" && normalizedType !== "stock") {
      return NextResponse.json(
        { error: 'type inválido. Debe ser "harvest" o "stock".' },
        { status: 400 },
      );
    }

    const parsedId = Number(idParam);
    if (!Number.isFinite(parsedId)) {
      return NextResponse.json(
        { error: "id inválido. Debe ser un número." },
        { status: 400 },
      );
    }

    const availableKgs =
      normalizedType === "harvest"
        ? await getHarvestAvailableKgs(parsedId)
        : await getStockAvailableKgs(parsedId);

    return NextResponse.json({ availableKgs });
  } catch (error) {
    console.error("Error al calcular disponibilidad de origen", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al calcular disponibilidad";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
