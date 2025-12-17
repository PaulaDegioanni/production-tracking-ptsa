// src/lib/baserow/cycleDetail.ts

import { getCycleByIdDto, CycleDto } from './cycles';
import { LotDto, getLotsByIdsDto } from './lots';
import { HarvestDto, getHarvestsByCycleIdDto } from './harvests';
import { StockDto, getStockByCycleIdDto } from './stocks';
import { TruckTripDto, getTruckTripsByOriginsDto } from './truckTrips';

export interface CycleDetailDto {
  cycle: CycleDto;
  lots: LotDto[];
  harvests: HarvestDto[];
  stockUnits: StockDto[];
  truckTrips: TruckTripDto[];
}

export async function getCycleDetailDto(
  cycleId: number
): Promise<CycleDetailDto | null> {
  const cycle = await getCycleByIdDto(cycleId);
  if (!cycle) return null;

  const [lots, harvests, stockUnits] = await Promise.all([
    getLotsByIdsDto(cycle.lotIds),
    getHarvestsByCycleIdDto(cycleId),
    getStockByCycleIdDto(cycleId),
  ]);

  const harvestIds = harvests.map((h) => h.id);
  const stockIds = stockUnits.map((s) => s.id);

  const truckTrips = await getTruckTripsByOriginsDto({
    harvestIds,
    stockIds,
  });

  return {
    cycle,
    lots,
    harvests,
    stockUnits,
    truckTrips,
  };
}
