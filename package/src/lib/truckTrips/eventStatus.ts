// src/lib/truckTrips/eventStatus.ts
import "server-only";

import { getTableRowById } from "@/lib/baserow/client";
import { extractLinkRowIds, toNumber } from "@/lib/baserow/utils";
import { getHarvestAvailableKgs } from "@/lib/baserow/harvests";
import { getStockAvailableKgs } from "@/lib/baserow/stocks";
import {
  TRUCK_TRIPS_TABLE_ID,
  type TruckTripRaw,
} from "@/lib/baserow/truckTrips";

const EVENT_STATUS_FIELD = "eventStatus";

const resolveOriginFromValues = (values: Record<string, any>) => {
  const harvestKey = "Cosecha Origen (opcional)";
  const stockKey = "Stock Origen (opcional)";
  const hasHarvestKey = Object.prototype.hasOwnProperty.call(values, harvestKey);
  const hasStockKey = Object.prototype.hasOwnProperty.call(values, stockKey);

  if (!hasHarvestKey && !hasStockKey) return null;

  const harvestIds = extractLinkRowIds(values[harvestKey]);
  const stockIds = extractLinkRowIds(values[stockKey]);

  if (harvestIds.length) {
    return { originType: "harvest" as const, originId: harvestIds[0] };
  }
  if (stockIds.length) {
    return { originType: "stock" as const, originId: stockIds[0] };
  }

  return { originType: null, originId: null };
};

const resolveOriginFromRow = (row?: TruckTripRaw | null) => {
  if (!row) return null;
  const harvestIds = extractLinkRowIds(row["Cosecha Origen (opcional)"]);
  const stockIds = extractLinkRowIds(row["Stock Origen (opcional)"]);
  if (harvestIds.length) {
    return { originType: "harvest" as const, originId: harvestIds[0] };
  }
  if (stockIds.length) {
    return { originType: "stock" as const, originId: stockIds[0] };
  }
  return { originType: null, originId: null };
};

const resolveOriginKgs = (values: Record<string, any>, row?: TruckTripRaw) => {
  if (Object.prototype.hasOwnProperty.call(values, "Kg carga origen")) {
    return toNumber(values["Kg carga origen"]);
  }
  if (row) {
    return toNumber(row["Kg carga origen"]);
  }
  return null;
};

export type TruckTripEventStatusResolution = {
  status: "applied" | "kgsError" | null;
  availableKgs: number | null;
};

export async function computeTruckTripEventStatus(params: {
  payload: Record<string, any>;
  rowId?: number;
}): Promise<TruckTripEventStatusResolution> {
  const { payload, rowId } = params;
  const existingRow =
    rowId && Number.isFinite(rowId)
      ? await getTableRowById<TruckTripRaw>(TRUCK_TRIPS_TABLE_ID, rowId)
      : null;

  const originFromPayload = resolveOriginFromValues(payload);
  const originFromRow = resolveOriginFromRow(existingRow);
  const originType = originFromPayload?.originType ?? originFromRow?.originType;
  const originId = originFromPayload?.originId ?? originFromRow?.originId;
  const originKgs = resolveOriginKgs(payload, existingRow ?? undefined);

  if (!originType || !originId || originKgs === null) {
    return { status: null, availableKgs: null };
  }

  let availableKgs =
    originType === "harvest"
      ? await getHarvestAvailableKgs(originId)
      : await getStockAvailableKgs(originId);

  if (
    existingRow &&
    originFromRow?.originType &&
    originFromRow?.originId &&
    originFromRow.originType === originType &&
    originFromRow.originId === originId
  ) {
    availableKgs += toNumber(existingRow["Kg carga origen"]);
  }

  const status: "applied" | "kgsError" =
    originKgs <= availableKgs ? "applied" : "kgsError";

  return { status, availableKgs };
}

export async function buildEventStatusPayload(
  status: "applied" | "kgsError" | null,
): Promise<Record<string, any>> {
  if (!status) return {};
  return { [EVENT_STATUS_FIELD]: status };
}
