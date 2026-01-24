import { NextResponse } from 'next/server';

import { getHarvestsByCycleIdDto } from '@/lib/baserow/harvests';
import { getStockByCycleIdDto } from '@/lib/baserow/stocks';
import { getTruckTripsByOriginsDto } from '@/lib/baserow/truckTrips';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

const invalidIdResponse = () =>
  NextResponse.json({ error: 'Invalid cycle id' }, { status: 400 });

export async function GET(_request: Request, context: RouteParams) {
  const params = await context.params;
  const idRaw = params?.id;
  const cycleId = Number(idRaw);

  if (!idRaw || Number.isNaN(cycleId) || cycleId <= 0) {
    return invalidIdResponse();
  }

  try {
    const [harvests, stockUnits] = await Promise.all([
      getHarvestsByCycleIdDto(cycleId),
      getStockByCycleIdDto(cycleId),
    ]);

    const harvestIds = harvests.map((h) => h.id);
    const stockIds = stockUnits.map((s) => s.id);

    const truckTrips = await getTruckTripsByOriginsDto({
      harvestIds,
      stockIds,
    });

    return NextResponse.json({ truckTrips });
  } catch (error) {
    console.error('Error al cargar viajes del ciclo', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error desconocido al cargar viajes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
