import { NextRequest, NextResponse } from "next/server";

import {
  getTruckTripOriginById,
  getTruckTripOriginOptions,
  getTruckTripSelectOptions,
  TruckTripOriginType,
} from "@/lib/baserow/truckTripFormOptions";

const isValidOriginType = (
  value: string | null,
): value is TruckTripOriginType => value === "harvest" || value === "stock";

export async function GET(request: NextRequest) {
  try {
    const campoIdParam = request.nextUrl.searchParams.get("campoId");
    const campoNameParam = request.nextUrl.searchParams.get("campoName");
    const originTypeParam = request.nextUrl.searchParams.get("originType");
    const originIdParam = request.nextUrl.searchParams.get("originId");

    const wantsOrigins =
      campoIdParam !== null ||
      campoNameParam !== null ||
      originTypeParam !== null ||
      originIdParam !== null;

    if (wantsOrigins) {
      if (!originTypeParam) {
        return NextResponse.json(
          {
            error: "Debes especificar originType para obtener orígenes.",
          },
          { status: 400 },
        );
      }

      const campoName = campoNameParam?.trim() || undefined;
      let campoId: number | undefined;

      if (campoIdParam && campoIdParam.trim() !== "") {
        const parsedCampoId = Number(campoIdParam);
        if (!Number.isFinite(parsedCampoId)) {
          return NextResponse.json(
            { error: "campoId inválido. Debe ser un número." },
            { status: 400 },
          );
        }
        campoId = parsedCampoId;
      }

      if (!campoId && !campoName) {
        return NextResponse.json(
          { error: "Debes especificar campoId o campoName." },
          { status: 400 },
        );
      }

      const normalizedOriginType = originTypeParam.toLowerCase();
      if (!isValidOriginType(normalizedOriginType)) {
        return NextResponse.json(
          {
            error: 'originType inválido. Debe ser "harvest" o "stock".',
          },
          { status: 400 },
        );
      }

      const { origins } = await getTruckTripOriginOptions({
        originType: normalizedOriginType,
        fieldId: campoId,
        fieldName: campoName,
      });

      const response: Record<string, any> = { origins };

      if (originIdParam) {
        const parsedOriginId = Number(originIdParam);
        if (!Number.isFinite(parsedOriginId)) {
          return NextResponse.json(
            { error: "originId inválido. Debe ser un número." },
            { status: 400 },
          );
        }

        let selectedOrigin = origins.find(
          (origin) => origin.id === parsedOriginId,
        );
        if (!selectedOrigin) {
          const fetchedOrigin = await getTruckTripOriginById({
            originType: normalizedOriginType,
            originId: parsedOriginId,
          });
          selectedOrigin = fetchedOrigin ?? undefined;
        }

        if (selectedOrigin) {
          response.selectedOrigin = {
            id: selectedOrigin.id,
            cycleLabel: selectedOrigin.meta.cycleLabel,
            cycleRowId: selectedOrigin.meta.cycleRowId,
          };
        }
      }

      return NextResponse.json(response);
    }

    const options = await getTruckTripSelectOptions();
    return NextResponse.json(options);
  } catch (error) {
    console.error("Error al cargar opciones de viajes de camión", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al cargar opciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
