"use client";

import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  alpha,
  Fade,
  Collapse,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  IconFreezeRowColumn,
  IconSeedling,
  IconTruck,
  IconTractor,
  IconMoneybag,
} from "@tabler/icons-react";
import type { PaletteColor } from "@mui/material/styles";
import type { SnackbarCloseReason } from "@mui/material/Snackbar";
import GrassIcon from "@mui/icons-material/Grass";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import DateRangeIcon from "@mui/icons-material/DateRange";
import EditIcon from "@mui/icons-material/Edit";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import StatusChip, {
  type PaletteKey,
  type StatusChipOption,
} from "@/app/(DashboardLayout)/components/shared/StatusChip";
import StockDialog, {
  type StockFormValues,
} from "@/app/(DashboardLayout)/components/stock/StockDialog";
import TruckTripDialog, {
  type TruckTripFormValues,
} from "@/app/(DashboardLayout)/components/truckTrips/TruckTripDialog";

import type { CycleDetailDto } from "@/lib/baserow/cycleDetail";
import type { CycleStatus } from "@/lib/baserow/cycles";
import type { LotDto } from "@/lib/baserow/lots";
import type { Theme } from "@mui/material/styles";

type CycleDetailPageClientProps = {
  initialDetail: CycleDetailDto;
};

type CycleDatesPayload = {
  fallowStartDate: string | null;
  sowingDate: string | null;
  estimatedHarvestDate: string | null;
};

const parseDateString = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeNullableDate = (value: string | null) =>
  value === null ? undefined : value;

const updateCycleStatus = async (
  cycleId: number,
  status: CycleStatus,
): Promise<void> => {
  const response = await fetch(`/api/cycles/${cycleId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    let message = "No se pudo actualizar el estado del ciclo";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
};

const updateCycleDates = async (
  cycleId: number,
  payload: Partial<CycleDatesPayload>,
): Promise<void> => {
  const response = await fetch(`/api/cycles/${cycleId}/dates`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "No se pudieron actualizar las fechas del ciclo";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
};

const updateCycleLots = async (
  cycleId: number,
  lotIds: number[],
): Promise<{
  cycle: { id: number; lotIds: number[]; fieldId: number | null };
  lots: LotDto[];
}> => {
  const response = await fetch(`/api/cycles/${cycleId}/lots`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lotIds }),
  });

  if (!response.ok) {
    let message = "No se pudieron actualizar los lotes del ciclo";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as {
    cycle: { id: number; lotIds: number[]; fieldId: number | null };
    lots: LotDto[];
  };
};

const getStockStatusLabel = (status: unknown): string => {
  if (!status) return "—";
  if (typeof status === "string") return status;

  if (
    typeof status === "object" &&
    status !== null &&
    "value" in status &&
    (status as { value?: unknown }).value
  ) {
    return String((status as { value?: unknown }).value);
  }

  return String(status);
};

const CycleDetailPageClient = ({
  initialDetail,
}: CycleDetailPageClientProps) => {
  const { harvests, stockUnits, truckTrips } = initialDetail;
  const [cycleState, setCycleState] = React.useState(initialDetail.cycle);
  const [lotsState, setLotsState] = React.useState(initialDetail.lots);
  const cycle = cycleState;
  const lots = lotsState;
  const resolvedFieldId = React.useMemo(() => {
    const normalizeFieldId = (value: number | null | undefined) =>
      typeof value === "number" && !Number.isNaN(value) ? value : null;

    const fromCycle = normalizeFieldId(cycle.fieldId);
    if (fromCycle !== null) return fromCycle;

    const fromLots = lots
      .map((lot) => normalizeFieldId(lot.fieldId))
      .find((value): value is number => value !== null);
    if (fromLots !== undefined) {
      return fromLots;
    }

    const fromStock = stockUnits
      .map((unit) => normalizeFieldId(unit.fieldId))
      .find((value): value is number => value !== null);
    if (fromStock !== undefined) {
      return fromStock;
    }

    return null;
  }, [cycle.fieldId, lots, stockUnits]);

  const formatDate = (value?: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const CYCLE_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "planificado", label: "Planificado", color: "default" },
    { value: "barbecho", label: "Barbecho", color: "warning" },
    { value: "sembrado", label: "Sembrado", color: "info" },
    {
      value: "listo-para-cosechar",
      label: "Listo para cosechar",
      color: "warning",
    },
    { value: "en-cosecha", label: "En cosecha", color: "primary" },
    { value: "cosechado", label: "Cosechado", color: "success" },
  ];

  const TRIP_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "Entregado", color: "success" },
    { value: "En viaje", color: "warning" },
    { value: "Pendiente", color: "info" },
  ];

  const STOCK_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "Nuevo", color: "info" },
    { value: "Parcial", color: "warning" },
    { value: "Completo", color: "success" },
    { value: "Vacío", color: "default" },
  ];

  const lotsById = React.useMemo(() => {
    const map = new Map<number, string>();
    lots.forEach((lot) => map.set(lot.id, lot.code));
    return map;
  }, [lots]);

  type HarvestTimeRange = {
    start: string | null;
    end: string | null;
    days: number | null;
  };

  const computeHarvestTimeRange = React.useMemo<HarvestTimeRange>(() => {
    if (!harvests.length) {
      return { start: null, end: null, days: null };
    }
    const dates = harvests
      .map((h) => (h.date ? new Date(h.date) : null))
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!dates.length) {
      return { start: null, end: null, days: null };
    }

    const start = dates[0];
    const end = dates[dates.length - 1];
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      days,
    };
  }, [harvests]);

  const [status, setStatus] = React.useState<CycleStatus>(cycle.status);
  const [statusDraft, setStatusDraft] = React.useState<CycleStatus>(
    cycle.status,
  );
  const [isEditingStatus, setIsEditingStatus] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [statusSnackbarOpen, setStatusSnackbarOpen] = React.useState(false);
  const [localCycleDates, setLocalCycleDates] =
    React.useState<CycleDatesPayload>({
      fallowStartDate: cycle.fallowStartDate ?? null,
      sowingDate: cycle.sowingDate ?? null,
      estimatedHarvestDate: cycle.estimatedHarvestDate ?? null,
    });
  const [isEditingDates, setIsEditingDates] = React.useState(false);
  const [datesDraft, setDatesDraft] = React.useState<CycleDatesPayload>({
    fallowStartDate: cycle.fallowStartDate ?? null,
    sowingDate: cycle.sowingDate ?? null,
    estimatedHarvestDate: cycle.estimatedHarvestDate ?? null,
  });
  const [datesSaving, setDatesSaving] = React.useState(false);
  const [datesError, setDatesError] = React.useState<string | null>(null);
  const [datesSnackbarOpen, setDatesSnackbarOpen] = React.useState(false);
  const hasHarvests = harvests.length > 0;
  const [isEditLotsOpen, setIsEditLotsOpen] = React.useState(false);
  const [lotsOptions, setLotsOptions] = React.useState<LotDto[]>([]);
  const [lotsOptionsLoading, setLotsOptionsLoading] = React.useState(false);
  const [selectedLotIdsDraft, setSelectedLotIdsDraft] = React.useState<number[]>(
    cycle.lotIds,
  );
  const [lotsSaving, setLotsSaving] = React.useState(false);
  const [lotsError, setLotsError] = React.useState<string | null>(null);
  const [lotsSnackbarOpen, setLotsSnackbarOpen] = React.useState(false);
  const lotsSelectionError =
    selectedLotIdsDraft.length === 0
      ? "Debés seleccionar al menos un lote"
      : null;
  const isDesktop = useMediaQuery(
    (theme: Theme) => theme.breakpoints.up("md"),
    { defaultMatches: true },
  );
  const [isLotsOpen, setIsLotsOpen] = React.useState(true);
  const [isHarvestsOpen, setIsHarvestsOpen] = React.useState(true);
  const [isStockOpen, setIsStockOpen] = React.useState(true);
  const [isTripsOpen, setIsTripsOpen] = React.useState(true);

  const [isCreateStockOpen, setIsCreateStockOpen] = React.useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = React.useState(false);
  const [createStockInitialValues, setCreateStockInitialValues] =
    React.useState<StockFormValues | null>(null);

  const [createTripInitialValues, setCreateTripInitialValues] =
    React.useState<TruckTripFormValues | null>(null);

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const getTodayDateString = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const getCurrentTimeString = (): string => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const buildCreateStockInitialValues =
    React.useCallback((): StockFormValues => {
      return {
        "Tipo unidad": "",
        Campo: resolvedFieldId ?? "",
        "Ciclo de siembra": cycle.id ?? "", // row id del ciclo (Baserow)
        Cultivo: cycle.crop ?? "",
        "Fecha de creación": getTodayDateString(),
        Estado: "",
        Notas: "",
        ID: "",
        "Kgs actuales": "",
        "Total kgs ingresados": "",
        "Total kgs egresados": "",
        "Cosechas asociadas": [],
        "Viajes de camión desde stock": [],
      };
    }, [cycle, resolvedFieldId]);

  const buildCreateTripInitialValues =
    React.useCallback((): TruckTripFormValues => {
      return {
        Camión: "",
        CTG: "",
        Estado: "", // TruckTripDialog tiene defaults internos; si querés, lo dejamos vacío y que el dialog lo setee
        "Fecha de salida - Fecha": getTodayDateString(),
        "Fecha de salida - Hora": getCurrentTimeString(),
        "Campo origen": resolvedFieldId ?? "",
        "Tipo origen": "harvest",
        Origen: "",
        "Ciclo de siembra": cycle.cycleId ?? "", // label. se recalcula cuando elijas Origen
        "Kg carga origen": "",
        "Tipo destino": "",
        Proveedor: "",
        "Detalle Destino": "",
        "Kg carga destino": "",
        Notas: "",
      };
    }, [cycle, resolvedFieldId]);

  const handleOpenCreateStock = React.useCallback(() => {
    setCreateStockInitialValues(buildCreateStockInitialValues());
    setIsCreateStockOpen(true);
  }, [buildCreateStockInitialValues]);

  const handleCloseCreateStock = React.useCallback(() => {
    setIsCreateStockOpen(false);
  }, []);

  const handleOpenCreateTrip = React.useCallback(() => {
    setCreateTripInitialValues(buildCreateTripInitialValues());
    setIsCreateTripOpen(true);
  }, [buildCreateTripInitialValues]);

  const handleCloseCreateTrip = React.useCallback(() => {
    setIsCreateTripOpen(false);
  }, []);

  React.useEffect(() => {
    if (isDesktop) {
      setIsLotsOpen(true);
      setIsHarvestsOpen(true);
      setIsStockOpen(true);
      setIsTripsOpen(true);
      return;
    }
    setIsLotsOpen(true);
    setIsHarvestsOpen(false);
    setIsStockOpen(false);
    setIsTripsOpen(false);
  }, [isDesktop]);

  const harvestTimelineDate = computeHarvestTimeRange.start
    ? `${formatDate(computeHarvestTimeRange.start)} – ${formatDate(
        computeHarvestTimeRange.end,
      )}`
    : formatDate(localCycleDates.estimatedHarvestDate);

  const harvestDurationLabel =
    computeHarvestTimeRange.start && computeHarvestTimeRange.days
      ? `${computeHarvestTimeRange.days} días`
      : undefined;

  const computedCropDurationDays = React.useMemo(() => {
    const sowingDate = parseDateString(localCycleDates.sowingDate);
    const harvestDate = parseDateString(
      computeHarvestTimeRange.start ?? localCycleDates.estimatedHarvestDate,
    );

    if (!sowingDate || !harvestDate) return null;
    const diffMs = harvestDate.getTime() - sowingDate.getTime();
    if (!Number.isFinite(diffMs)) return null;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : null;
  }, [
    computeHarvestTimeRange.start,
    localCycleDates.estimatedHarvestDate,
    localCycleDates.sowingDate,
  ]);

  const cropDurationLabel = (() => {
    if (computedCropDurationDays !== null) {
      return `${computedCropDurationDays} días`;
    }
    if (typeof cycle.cropDurationDays === "number") {
      return `${cycle.cropDurationDays} días`;
    }
    return undefined;
  })();

  const mobileTimelineItems: Array<{
    icon: React.ReactNode;
    label: string;
    dateLabel: string;
    color: PaletteKey;
    durationLabel?: string;
    cropDurationLabel?: string;
  }> = [
    {
      icon: <GrassIcon />,
      label: "Barbecho",
      dateLabel: formatDate(localCycleDates.fallowStartDate),
      color: "primary",
    },
    {
      icon: <AgricultureIcon />,
      label: "Siembra",
      dateLabel: formatDate(localCycleDates.sowingDate),
      color: "primary",
      cropDurationLabel,
    },
  ];

  mobileTimelineItems.push(
    computeHarvestTimeRange.start
      ? {
          icon: <EventAvailableIcon />,
          label: "Cosecha",
          dateLabel: harvestTimelineDate,
          color: "success",
          durationLabel: harvestDurationLabel,
        }
      : {
          icon: <DateRangeIcon />,
          label: "Cosecha Est.",
          dateLabel: harvestTimelineDate,
          color: "warning",
        },
  );

  const dateOrderError = React.useMemo(() => {
    const fallowStartDate =
      datesDraft.fallowStartDate ?? localCycleDates.fallowStartDate;
    const sowingDate = datesDraft.sowingDate ?? localCycleDates.sowingDate;
    const estimatedHarvestDate = hasHarvests
      ? null
      : datesDraft.estimatedHarvestDate ?? localCycleDates.estimatedHarvestDate;

    if (fallowStartDate && sowingDate && fallowStartDate > sowingDate) {
      return "La fecha de barbecho debe ser anterior o igual a la fecha de siembra.";
    }
    if (sowingDate && estimatedHarvestDate && sowingDate > estimatedHarvestDate) {
      return "La fecha de siembra debe ser anterior o igual a la fecha estimada de cosecha.";
    }
    return null;
  }, [datesDraft, hasHarvests, localCycleDates]);

  const canSaveDates = !datesSaving && !dateOrderError;

  const handleToggleStatusEdit = () => {
    setStatusError(null);
    setStatusDraft(status);
    setIsEditingStatus((prev) => !prev);
  };

  const handleCancelStatusEdit = () => {
    setStatusDraft(status);
    setStatusError(null);
    setIsEditingStatus(false);
  };

  const handleSaveStatus = async () => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      await updateCycleStatus(cycle.id, statusDraft);
      setStatus(statusDraft);
      setCycleState((prev) => ({ ...prev, status: statusDraft }));
      setIsEditingStatus(false);
      setStatusSnackbarOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar el estado";
      setStatusError(message);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleToggleDatesEdit = () => {
    setDatesError(null);
    setDatesDraft(localCycleDates);
    setIsEditingDates((prev) => !prev);
  };

  const handleCancelDatesEdit = () => {
    setDatesDraft(localCycleDates);
    setDatesError(null);
    setIsEditingDates(false);
  };

  const handleSaveDates = async () => {
    setDatesSaving(true);
    setDatesError(null);
    try {
      const payload: Partial<CycleDatesPayload> = {
        fallowStartDate: datesDraft.fallowStartDate,
        sowingDate: datesDraft.sowingDate,
      };
      if (!hasHarvests) {
        payload.estimatedHarvestDate = datesDraft.estimatedHarvestDate;
      }

      await updateCycleDates(cycle.id, payload);
      setLocalCycleDates((prev) => ({
        fallowStartDate: datesDraft.fallowStartDate,
        sowingDate: datesDraft.sowingDate,
        estimatedHarvestDate: hasHarvests
          ? prev.estimatedHarvestDate
          : datesDraft.estimatedHarvestDate,
      }));
      setCycleState((prev) => ({
        ...prev,
        fallowStartDate: normalizeNullableDate(datesDraft.fallowStartDate),
        sowingDate: normalizeNullableDate(datesDraft.sowingDate),
        estimatedHarvestDate: hasHarvests
          ? prev.estimatedHarvestDate
          : normalizeNullableDate(datesDraft.estimatedHarvestDate),
      }));
      setIsEditingDates(false);
      setDatesSnackbarOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar las fechas";
      setDatesError(message);
    } finally {
      setDatesSaving(false);
    }
  };

  const handleSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === "clickaway") return;
    setStatusSnackbarOpen(false);
  };

  const handleDatesSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === "clickaway") return;
    setDatesSnackbarOpen(false);
  };

  const handleOpenEditLots = () => {
    setLotsError(null);
    setSelectedLotIdsDraft(cycle.lotIds);
    setIsEditLotsOpen(true);
  };

  const handleCloseEditLots = () => {
    if (lotsSaving) return;
    setIsEditLotsOpen(false);
  };

  const loadLotsOptions = React.useCallback(
    async (fieldId: number | null) => {
      if (!fieldId) {
        setLotsOptions([]);
        return;
      }
      try {
        setLotsOptionsLoading(true);
        setLotsError(null);
        const response = await fetch(`/api/fields/${fieldId}/lots`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(errorBody || "No se pudieron cargar los lotes");
        }
        const data = (await response.json()) as { lots?: LotDto[] };
        const lots = Array.isArray(data.lots) ? data.lots : [];
        setLotsOptions(
          lots.sort((a, b) => a.code.localeCompare(b.code)),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Error inesperado al cargar lotes";
        setLotsError(message);
      } finally {
        setLotsOptionsLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!isEditLotsOpen) return;
    loadLotsOptions(resolvedFieldId);
  }, [isEditLotsOpen, loadLotsOptions, resolvedFieldId]);

  const handleSaveLots = async () => {
    if (!selectedLotIdsDraft.length) {
      setLotsError("Debés seleccionar al menos un lote");
      return;
    }
    setLotsSaving(true);
    setLotsError(null);
    try {
      const result = await updateCycleLots(cycle.id, selectedLotIdsDraft);
      setCycleState((prev) => ({
        ...prev,
        lotIds: result.cycle.lotIds,
        fieldId: result.cycle.fieldId ?? prev.fieldId,
      }));
      setLotsState(result.lots);
      setIsEditLotsOpen(false);
      setLotsSnackbarOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar los lotes";
      setLotsError(message);
    } finally {
      setLotsSaving(false);
    }
  };

  const handleLotsSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === "clickaway") return;
    setLotsSnackbarOpen(false);
  };

  type StatCardProps = {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    color?: PaletteKey;
    gradient?: boolean;
  };

  const StatCard = ({
    icon,
    label,
    value,
    unit,
    color = "primary",
    gradient = false,
  }: StatCardProps) => (
    <Paper
      elevation={0}
      sx={(theme) => {
        const paletteColor = theme.palette[color] as PaletteColor;
        return {
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: gradient
            ? `linear-gradient(135deg, ${alpha(
                paletteColor.main,
                0.08,
              )} 0%, ${alpha(paletteColor.light, 0.03)} 100%)`
            : theme.palette.background.paper,
          border: `1px solid ${alpha(paletteColor.main, 0.12)}`,
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: `0 12px 28px ${alpha(paletteColor.main, 0.15)}`,
            borderColor: alpha(paletteColor.main, 0.3),
          },
        };
      }}
    >
      <Stack
        spacing={{ xs: 1.5, md: 2 }}
        direction={{ xs: "row", md: "column" }}
        alignItems={{ xs: "center", md: "self-start" }}
      >
        <Box
          sx={(theme) => {
            const paletteColor = theme.palette[color] as PaletteColor;
            return {
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              borderRadius: 2,
              bgcolor: alpha(paletteColor.main, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: paletteColor.main,
            };
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: { xs: "0.6rem", md: "0.7rem" },
            }}
          >
            {label}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.5}>
            <Typography
              variant="h3"
              sx={(theme) => {
                const paletteColor = theme.palette[color] as PaletteColor;
                return {
                  fontWeight: 800,
                  color: paletteColor.main,
                  lineHeight: 1.2,
                  fontSize: { xs: "1.6rem", md: "2.4rem" },
                };
              }}
            >
              {value}
            </Typography>
            {unit && (
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {unit}
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );

  type TimelinePhaseProps = {
    icon: React.ReactNode;
    title: string;
    date: string;
    color: PaletteKey;
    isLast?: boolean;
    durationLabel?: string;
    cropDurationLabel?: string;
  };

  const TimelinePhase = ({
    icon,
    title,
    date,
    color,
    isLast = false,
    durationLabel,
    cropDurationLabel,
  }: TimelinePhaseProps) => (
    <Box sx={{ position: "relative", flex: 1 }}>
      <Stack alignItems="center" spacing={1.5}>
        <Box
          sx={(theme) => {
            const paletteColor = theme.palette[color] as PaletteColor;
            return {
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${paletteColor.main} 0%, ${paletteColor.dark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              position: "relative",
              zIndex: 2,
              boxShadow: `0 8px 24px ${alpha(paletteColor.main, 0.35)}`,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: `0 12px 32px ${alpha(paletteColor.main, 0.45)}`,
              },
            };
          }}
        >
          {icon}
        </Box>
        <Box textAlign="center">
          <Typography
            variant="caption"
            sx={(theme) => {
              const paletteColor = theme.palette[color] as PaletteColor;
              return {
                color: paletteColor.main,
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "0.7rem",
                letterSpacing: "0.5px",
              };
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color="text.primary"
            mt={0.5}
          >
            {date}
          </Typography>
          {durationLabel && (
            <Chip
              label={`Cosecha: ${durationLabel}`}
              sx={(theme) => ({
                mt: "1rem",
                fontWeight: 600,
                borderRadius: "8px",
                paddingX: "80px",
              })}
            />
          )}
          {cropDurationLabel && (
            <Chip
              label={`Duración cultivo: ${cropDurationLabel}`}
              sx={(theme) => ({
                mt: "1rem",
                fontWeight: 600,
                borderRadius: "8px",
                paddingX: "80px",
              })}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );

  type EmptyStateMessageProps = {
    message: string;
  };

  const EmptyStateMessage = ({ message }: EmptyStateMessageProps) => (
    <Box
      sx={(theme) => ({
        p: 3,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.grey[500], 0.08),
        border: `1px solid ${alpha(theme.palette.grey[500], 0.15)}`,
        textAlign: "center",
      })}
    >
      <Typography color="text.secondary" fontWeight={600}>
        {message}
      </Typography>
    </Box>
  );

  type SectionHeaderProps = {
    icon: React.ReactNode;
    title: string;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
    actions?: React.ReactNode;
  };

  const SectionHeader = ({
    icon,
    title,
    count,
    isOpen,
    onToggle,
    actions,
  }: SectionHeaderProps) => (
    <Box
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 2,
        cursor: "pointer",
        userSelect: "none",
        px: 1,
        py: 0.5,
        borderRadius: 2,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "4px",
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {icon}
        <Typography
          variant="h5"
          fontWeight={800}
          color="text.primary"
          sx={{ fontSize: { xs: "1.1rem", md: "1.5rem" } }}
        >
          {title} ({count})
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        {actions && (
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{ display: "flex", alignItems: "center" }}
          >
            {actions}
          </Box>
        )}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.primary",
          }}
        >
          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </Stack>
    </Box>
  );

  return (
    <PageContainer
      title={`Ciclo ${cycle.cycleId}`}
      description={`Detalle del ciclo ${cycle.cycleId}`}
      disableMobilePadding
    >
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
        {/* Hero Header */}
        <Box
          sx={(theme) => ({
            background: `${alpha(
              theme.palette.primary.main,
              0.05,
            )}` ,
            borderBottom: `1px solid ${theme.palette.divider}`,
            pt: { xs: 2, md: 6 },
            pb: { xs: 3, md: 6 },
            px: { xs: 2, md: 4 },
          })}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            maxWidth="1400px"
            mx="auto"
          >
            <Box>
              <Typography
                variant="h2"
                color="primary.dark"
                sx={{
                  fontWeight: 900,
                  mb: 1,
                }}
              >
                {cycle.cycleId}
              </Typography>
              
                <Chip
                  label={`Periodo ${cycle.period}`}
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: "primary.dark",
                    fontWeight: 700,
                    borderRadius: "8px",
                    mt: 2,
                  }}
                />
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StatusChip
                status={status}
                options={CYCLE_STATUS_OPTIONS}
                sx={{
                  height: 35,
                  borderRadius: "0.8rem",
                  px: 2,
                  py: 0,
                  fontSize: "0.875rem",
                }}
              />
              <IconButton
                size="medium"
                onClick={handleToggleStatusEdit}
                disabled={statusSaving}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="medium"
                onClick={handleToggleDatesEdit}
                disabled={datesSaving}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                <EditCalendarIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Collapse in={isEditingStatus}>
            <Box
              maxWidth="1400px"
              mx="auto"
              mt={3}
              sx={{
                display: "flex",
                justifyContent: { xs: "stretch", md: "flex-end" },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  width: { xs: "100%", md: 420 },
                }}
              >
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Estado del ciclo"
                    size="small"
                    fullWidth
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as CycleStatus)
                    }
                    disabled={statusSaving}
                    sx={{ maxWidth: 300 }}
                  >
                    {CYCLE_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleSaveStatus}
                      disabled={statusSaving}
                      sx={{ borderRadius: 2 }}
                    >
                      {statusSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancelStatusEdit}
                      disabled={statusSaving}
                      sx={{ borderRadius: 2 }}
                    >
                      Cancelar
                    </Button>
                  </Stack>
                  {statusError && (
                    <Alert
                      severity="error"
                      onClose={() => setStatusError(null)}
                    >
                      {statusError}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Collapse>

          <Collapse in={isEditingDates}>
            <Box
              maxWidth="1400px"
              mx="auto"
              mt={3}
              sx={{
                display: "flex",
                justifyContent: { xs: "stretch", md: "flex-end" },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  width: { xs: "100%", md: 640 },
                }}
              >
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: {
                        xs: "repeat(1, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                    }}
                  >
                    <TextField
                      type="date"
                      label="Fecha inicio barbecho"
                      size="small"
                      fullWidth
                      value={datesDraft.fallowStartDate ?? ""}
                      onChange={(event) =>
                        setDatesDraft((prev) => ({
                          ...prev,
                          fallowStartDate: event.target.value || null,
                        }))
                      }
                      disabled={datesSaving}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      type="date"
                      label="Fecha de siembra"
                      size="small"
                      fullWidth
                      value={datesDraft.sowingDate ?? ""}
                      onChange={(event) =>
                        setDatesDraft((prev) => ({
                          ...prev,
                          sowingDate: event.target.value || null,
                        }))
                      }
                      disabled={datesSaving}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      type="date"
                      label="Fecha estimada de cosecha"
                      size="small"
                      fullWidth
                      value={datesDraft.estimatedHarvestDate ?? ""}
                      onChange={(event) =>
                        setDatesDraft((prev) => ({
                          ...prev,
                          estimatedHarvestDate: event.target.value || null,
                        }))
                      }
                      disabled={datesSaving || hasHarvests}
                      helperText={
                        hasHarvests
                          ? "Ya hay cosechas registrada"
                          : undefined
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleSaveDates}
                      disabled={!canSaveDates}
                      sx={{ borderRadius: 2 }}
                    >
                      {datesSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancelDatesEdit}
                      disabled={datesSaving}
                      sx={{ borderRadius: 2 }}
                    >
                      Cancelar
                    </Button>
                  </Stack>
                  {dateOrderError && (
                    <Alert severity="error">{dateOrderError}</Alert>
                  )}
                  {datesError && (
                    <Alert severity="error" onClose={() => setDatesError(null)}>
                      {datesError}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Collapse>
        </Box>

        <Box maxWidth="1400px" mx="auto" px={{ xs: 2, md: 4 }} mt={4}>
          <Stack spacing={6}>
            {/* Timeline Section */}
            <Fade in timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  background: (theme) => theme.palette.background.paper,
                }}
              >
                {/* Desktop Timeline */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Box sx={{ position: "relative", px: 4 }}>
                    <Box
                      sx={(theme) => ({
                        position: "absolute",
                        top: "36px",
                        left: "10%",
                        right: "10%",
                        height: "3px",
                        background: ` ${alpha(
                          theme.palette.primary.main,
                          0.5,
                        )}`,
                        borderRadius: "8px",
                        zIndex: 0,
                      })}
                    />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ position: "relative", zIndex: 1 }}
                    >
                      <TimelinePhase
                        icon={<GrassIcon sx={{ fontSize: 32 }} />}
                        title="Barbecho"
                        date={formatDate(localCycleDates.fallowStartDate)}
                        color="primary"
                      />
                      <TimelinePhase
                        icon={<IconSeedling />}
                        title="Siembra"
                        date={formatDate(localCycleDates.sowingDate)}
                        color="primary"
                        cropDurationLabel={cropDurationLabel}
                      />
                      <TimelinePhase
                        icon={
                          computeHarvestTimeRange.start ? (
                            <EventAvailableIcon sx={{ fontSize: 32 }} />
                          ) : (
                            <DateRangeIcon sx={{ fontSize: 32 }} />
                          )
                        }
                        title={
                          computeHarvestTimeRange.start
                            ? "Cosecha"
                            : "Cosecha Est."
                        }
                        date={harvestTimelineDate}
                        color={
                          computeHarvestTimeRange.start ? "success" : "warning"
                        }
                        durationLabel={harvestDurationLabel}
                        isLast
                      />
                    </Stack>
                  </Box>
                </Box>

                {/* Mobile Timeline */}
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  <Stack spacing={3}>
                    {mobileTimelineItems.map((item, idx) => (
                      <Stack
                        key={`${item.label}-${idx}`}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                      >
                        <Box
                          sx={(theme) => {
                            const paletteColor = theme.palette[
                              item.color
                            ] as PaletteColor;
                            return {
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${paletteColor.main} 0%, ${paletteColor.dark} 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              flexShrink: 0,
                              boxShadow: `0 4px 12px ${alpha(paletteColor.main, 0.3)}`,
                            };
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: `${item.color}.dark`,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              fontSize: "0.7rem",
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {item.dateLabel}
                          </Typography>
                          {item.cropDurationLabel && (
                            <Chip
                              size="small"
                              label={`Duración cultivo: ${item.cropDurationLabel}`}
                              
                              sx={(theme) => ({
                                mt: 0.7,
                                fontWeight: 600,
                                borderRadius: "8px",
                              })}
                            />
                          )}
                          {item.durationLabel && (
                            <Chip
                              size="small"
                              label={item.durationLabel}
                              sx={{
                                mt: 0.7,
                                fontWeight: 600,
                                borderRadius: "8px",
                              }}
                            />
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Fade>

            {/* Stats Overview */}
            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                mb={3}
                color="text.primary"
              >
                Resumen General
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(5, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <StatCard
                  icon={<IconFreezeRowColumn />}
                  label="Superficie"
                  value={cycle.areaHa.toLocaleString("es-ES")}
                  unit="ha"
                  color="primary"
                  gradient
                />
                <StatCard
                  icon={<IconTractor />}
                  label="Rendimiento"
                  value={`${cycle.actualYield.toFixed(1)} / ${cycle.expectedYield.toFixed(1)}`}
                  unit="qq/ha"
                  color="info"
                  gradient
                />
                <StatCard
                  icon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
                  label="Cosechado"
                  value={cycle.totalKgs.toLocaleString("es-ES")}
                  unit="kg"
                  color="success"
                  gradient
                />
                <StatCard
                  icon={<IconMoneybag />}
                  label="En Stock"
                  value={cycle.stockKgs.toLocaleString("es-ES")}
                  unit="kg"
                  color="warning"
                  gradient
                />
                <StatCard
                  icon={<IconTruck />}
                  label="En camión"
                  value={cycle.truckKgs}
                  unit="kg"
                  color="secondary"
                  gradient
                />
              </Box>
            </Box>

            {/* Lots Section */}
            <Box>
              <SectionHeader
                icon={<IconFreezeRowColumn fontSize="40px" color="#3A3184" />}
                title="Lotes"
                count={lots.length}
                isOpen={isLotsOpen}
                onToggle={() => setIsLotsOpen((prev) => !prev)}
                actions={
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleOpenEditLots}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                    disabled={resolvedFieldId === null}
                  >
                    Editar lotes
                  </Button>
                }
              />

              <Collapse in={isLotsOpen} timeout={250} unmountOnExit>
                {lots.length === 0 ? (
                  <EmptyStateMessage message="Este ciclo no tiene lotes asociados." />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {/* Desktop Table */}
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                      <Table>
                        <TableHead
                          sx={(theme) => ({
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                          })}
                        >
                          <TableRow>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: "primary.main",
                                borderBottom: "2px solid",
                                borderColor: "primary.main",
                              }}
                            >
                              Lote
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: "primary.main",
                                borderBottom: "2px solid",
                                borderColor: "primary.main",
                              }}
                            >
                              Superficie (ha)
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {lots.map((lot) => (
                            <TableRow
                              key={lot.id}
                              sx={{
                                "&:hover": {
                                  bgcolor: (theme) =>
                                    alpha(theme.palette.primary.main, 0.02),
                                },
                              }}
                            >
                              <TableCell>
                                <Typography variant="body1" fontWeight={700}>
                                  {lot.code}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight={600}>
                                  {lot.areaHa.toLocaleString("es-ES")}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: "block", md: "none" } }}>
                      <Stack spacing={2}>
                        {lots.map((lot) => (
                          <Card
                            key={lot.id}
                            sx={{
                              borderRadius: 2,
                              border: (theme) =>
                                `1px solid ${theme.palette.divider}`,
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={700}
                                  color="primary"
                                >
                                  {lot.code}
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                  {lot.areaHa.toLocaleString("es-ES")} ha
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  </Paper>
                )}
              </Collapse>
            </Box>

            {/* Harvests Section */}
            <Box>
              <SectionHeader
                icon={
                  <CheckCircleIcon
                    sx={{ color: "success.main", fontSize: 32 }}
                  />
                }
                title="Cosechas"
                count={harvests.length}
                isOpen={isHarvestsOpen}
                onToggle={() => setIsHarvestsOpen((prev) => !prev)}
              />

              <Collapse in={isHarvestsOpen} timeout={250} unmountOnExit>
                {harvests.length === 0 ? (
                  <EmptyStateMessage message="No hay cosechas registradas para este ciclo." />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  >
                    {/* Desktop Table */}
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                      <Table>
                        <TableHead
                          sx={(theme) => ({
                            bgcolor: alpha(theme.palette.success.main, 0.08),
                          })}
                        >
                          <TableRow>
                            {[
                              "Cosecha",
                              "Fecha",
                              "Lotes",
                              "Kgs cosechados",
                              "Kgs camión directo",
                            ].map((header) => (
                              <TableCell
                                key={header}
                                align={
                                  header.includes("Kgs") ? "right" : "left"
                                }
                                sx={{
                                  fontWeight: 700,
                                  color: "success.dark",
                                  borderBottom: "2px solid",
                                  borderColor: "success.main",
                                }}
                              >
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {harvests.map((h) => {
                            const lotNames = h.lotsIds
                              .map((id) => lotsById.get(id))
                              .filter(Boolean)
                              .join(", ");
                            return (
                              <TableRow
                                key={h.id}
                                sx={{
                                  "&:hover": {
                                    bgcolor: (theme) =>
                                      alpha(theme.palette.success.main, 0.02),
                                  },
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body1" fontWeight={700}>
                                    {h.harvestId}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body1" fontWeight={700}>
                                    {formatDate(h.date)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body1">
                                    {lotNames || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={700}>
                                    {h.harvestedKgs.toLocaleString("es-ES")}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={600}>
                                    {h.directTruckKgs.toLocaleString("es-ES")}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: "block", md: "none" } }}>
                      <Stack spacing={2}>
                        {harvests.map((h) => {
                          const lotNames = h.lotsIds
                            .map((id) => lotsById.get(id))
                            .filter(Boolean)
                            .join(", ");
                          return (
                            <Card
                              key={h.id}
                              sx={{
                                borderRadius: 2,
                                border: (theme) =>
                                  `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                              }}
                            >
                              <CardContent>
                                <Stack spacing={1.5}>
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    color="success.dark"
                                  >
                                    {h.harvestId}
                                  </Typography>
                                  <Divider />
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={700}
                                    >
                                      Lotes
                                    </Typography>
                                    <Typography variant="body2" mt={0.5}>
                                      {lotNames || "—"}
                                    </Typography>
                                  </Box>

                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    paddingRight="20px"
                                  >
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        Kgs cosechados
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        mt={0.5}
                                        fontWeight={800}
                                        color="success.dark"
                                      >
                                        {h.harvestedKgs.toLocaleString("es-ES")}{" "}
                                        kg
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        Camión directo
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        mt={0.5}
                                        fontWeight={600}
                                      >
                                        {h.directTruckKgs.toLocaleString(
                                          "es-ES",
                                        )}{" "}
                                        kg
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Paper>
                )}
              </Collapse>
            </Box>

            {/* Stock Units Section */}
            <Box>
              <SectionHeader
                icon={<IconMoneybag fontSize="40px" color="#F0C05A" />}
                title="Stock"
                count={stockUnits.length}
                isOpen={isStockOpen}
                onToggle={() => setIsStockOpen((prev) => !prev)}
                actions={
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleOpenCreateStock}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                    disabled={resolvedFieldId === null}
                  >
                    + Nuevo stock
                  </Button>
                }
              />

              <Collapse in={isStockOpen} timeout={250} unmountOnExit>
                {stockUnits.length === 0 ? (
                  <EmptyStateMessage message="No hay unidades de stock asociadas a este ciclo." />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    }}
                  >
                    {/* Desktop Table */}
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                      <Table>
                        <TableHead
                          sx={(theme) => ({
                            bgcolor: alpha(theme.palette.warning.main, 0.08),
                          })}
                        >
                          <TableRow>
                            {[
                              "Bolsón / Unidad",
                              "Estado",
                              "Kgs ingresados",
                              "Kgs egresados",
                              "Saldo actual",
                            ].map((header) => (
                              <TableCell
                                key={header}
                                align={
                                  header.includes("Kgs") ||
                                  header.includes("Saldo")
                                    ? "right"
                                    : "left"
                                }
                                sx={{
                                  fontWeight: 700,
                                  color: "warning.dark",
                                  borderBottom: "2px solid",
                                  borderColor: "warning.main",
                                }}
                              >
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stockUnits.map((s) => (
                            <TableRow
                              key={s.id}
                              sx={{
                                "&:hover": {
                                  bgcolor: (theme) =>
                                    alpha(theme.palette.warning.main, 0.02),
                                },
                              }}
                            >
                              <TableCell>
                                <Typography variant="body1" fontWeight={700}>
                                  {s.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <StatusChip
                                  status={getStockStatusLabel(s.status)}
                                  options={STOCK_STATUS_OPTIONS}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight={600}>
                                  {s.totalInKgs.toLocaleString("es-ES")}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight={600}>
                                  {s.totalOutFromHarvestKgs.toLocaleString(
                                    "es-ES",
                                  )}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body1"
                                  fontWeight={800}
                                  color="warning.dark"
                                >
                                  {s.currentKgs.toLocaleString("es-ES")}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: "block", md: "none" } }}>
                      <Stack spacing={2}>
                        {stockUnits.map((s) => (
                          <Card
                            key={s.id}
                            sx={{
                              borderRadius: 2,
                              border: (theme) =>
                                `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                            }}
                          >
                            <CardContent>
                              <Stack spacing={1.5}>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight={700}
                                    color="warning.dark"
                                  >
                                    {s.name}
                                  </Typography>
                                  <StatusChip
                                    status={getStockStatusLabel(s.status)}
                                    options={STOCK_STATUS_OPTIONS}
                                  />
                                </Stack>
                                <Divider />
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  paddingRight="50px"
                                  paddingBottom="5px"
                                >
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={700}
                                    >
                                      ↑ Ingresados
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      mt={0.3}
                                    >
                                      {s.totalInKgs.toLocaleString("es-ES")} kg
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      fontWeight={700}
                                    >
                                      ↓ Egresados
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight={700}
                                      mt={0.3}
                                    >
                                      {s.totalOutFromHarvestKgs.toLocaleString(
                                        "es-ES",
                                      )}{" "}
                                      kg
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  Saldo actual
                                </Typography>
                                <Typography
                                  variant="h6"
                                  marginTop="0px"
                                  lineHeight="0.5rem"
                                  fontWeight={800}
                                  color="warning.dark"
                                >
                                  {s.currentKgs.toLocaleString("es-ES")} kg
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </Box>
                  </Paper>
                )}
              </Collapse>
            </Box>

            {/* Truck Trips Section */}
            <Box>
              <SectionHeader
                icon={
                  <LocalShippingIcon
                    sx={{ color: "secondary.main", fontSize: 32 }}
                  />
                }
                title="Viajes de camión"
                count={truckTrips.length}
                isOpen={isTripsOpen}
                onToggle={() => setIsTripsOpen((prev) => !prev)}
                actions={
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleOpenCreateTrip}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                    disabled={resolvedFieldId === null}
                  >
                    + Nuevo viaje
                  </Button>
                }
              />

              <Collapse in={isTripsOpen} timeout={250} unmountOnExit>
                {truckTrips.length === 0 ? (
                  <EmptyStateMessage message="No hay viajes de camión registrados para este ciclo." />
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                    }}
                  >
                    {/* Desktop Table */}
                    <Box sx={{ display: { xs: "none", md: "block" } }}>
                      <Table>
                        <TableHead
                          sx={(theme) => ({
                            bgcolor: alpha(theme.palette.secondary.main, 0.08),
                          })}
                        >
                          <TableRow>
                            {[
                              "ID viaje",
                              "Fecha",
                              "Estado",
                              "Camión",
                              "Origen",
                              "Destino",
                              "Kgs cargados",
                            ].map((header) => (
                              <TableCell
                                key={header}
                                align={
                                  header.includes("Kgs") ? "right" : "left"
                                }
                                sx={{
                                  fontWeight: 700,
                                  color: "secondary.dark",
                                  borderBottom: "2px solid",
                                  borderColor: "secondary.main",
                                }}
                              >
                                {header}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {truckTrips.map((t) => {
                            const fromStock =
                              (t.stockOriginIds ?? []).length > 0;
                            const fromHarvest =
                              (t.harvestOriginIds ?? []).length > 0;
                            const originLabel = fromStock
                              ? "Desde stock"
                              : fromHarvest
                                ? "Desde cosecha"
                                : "—";

                            return (
                              <TableRow
                                key={t.id}
                                sx={{
                                  "&:hover": {
                                    bgcolor: (theme) =>
                                      alpha(theme.palette.secondary.main, 0.02),
                                  },
                                }}
                              >
                                <TableCell>
                                  <Typography variant="body1" fontWeight={700}>
                                    {t.tripId}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body1" fontWeight={700}>
                                    {formatDate(t.date)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <StatusChip
                                    status={t.status}
                                    options={TRIP_STATUS_OPTIONS}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body1">
                                    {t.truckPlate || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={originLabel}
                                    variant="outlined"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                      borderRadius: "8px",
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body1">
                                    {t.destinationDetail ||
                                      t.destinationType ||
                                      "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body1"
                                    fontWeight={800}
                                    color="secondary.dark"
                                  >
                                    {t.totalKgsDestination.toLocaleString(
                                      "es-ES",
                                    )}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: "block", md: "none" } }}>
                      <Stack spacing={2}>
                        {truckTrips.map((t) => {
                          const fromStock = (t.stockOriginIds ?? []).length > 0;
                          const fromHarvest =
                            (t.harvestOriginIds ?? []).length > 0;
                          const originLabel = fromStock
                            ? "Stock"
                            : fromHarvest
                              ? "Cosecha"
                              : "—";

                          return (
                            <Card
                              key={t.id}
                              sx={{
                                borderRadius: 2,
                                border: (theme) =>
                                  `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                              }}
                            >
                              <CardContent>
                                <Stack spacing={1.5}>
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight={700}
                                      color="secondary.dark"
                                    >
                                      {t.tripId}
                                    </Typography>
                                    <StatusChip
                                      status={t.status}
                                      options={TRIP_STATUS_OPTIONS}
                                    />
                                  </Stack>
                                  <Chip
                                    variant="outlined"
                                    size="small"
                                    label={
                                      t.truckPlate || "Camión sin identificar"
                                    }
                                    sx={{ alignSelf: "flex-start" }}
                                  />
                                  <Divider />
                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    paddingRight="50px"
                                    paddingBottom="5px"
                                  >
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        Origen
                                      </Typography>
                                      <Typography variant="body2" mt={0.5}>
                                        {originLabel}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        fontWeight={700}
                                      >
                                        Destino
                                      </Typography>
                                      <Typography variant="body2" mt={0.5}>
                                        {t.destinationType ||
                                          t.destinationDetail ||
                                          "—"}
                                      </Typography>
                                    </Box>
                                  </Stack>

                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontWeight={700}
                                  >
                                    Carga
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    fontWeight={800}
                                    color="secondary.dark"
                                    lineHeight="0.5rem"
                                  >
                                    {t.totalKgsDestination.toLocaleString(
                                      "es-ES",
                                    )}{" "}
                                    kg
                                  </Typography>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    </Box>
                  </Paper>
                )}
              </Collapse>
            </Box>
          </Stack>
        </Box>
      </Box>
      {createStockInitialValues && (
        <StockDialog
          open={isCreateStockOpen}
          mode="create"
          activeStock={null}
          initialValues={createStockInitialValues}
          // ⚠️ por ahora: si no tenés estas options en este page, el dialog queda sin opciones
          unitTypeOptions={[]}
          statusOptions={[]}
          onClose={handleCloseCreateStock}
          onSuccess={() => setIsCreateStockOpen(false)}
        />
      )}

      {createTripInitialValues && (
        <TruckTripDialog
          open={isCreateTripOpen}
          mode="create"
          activeTrip={null}
          initialValues={createTripInitialValues}
          onClose={handleCloseCreateTrip}
          onSuccess={() => setIsCreateTripOpen(false)}
        />
      )}

      <Dialog
        open={isEditLotsOpen}
        onClose={handleCloseEditLots}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar lotes</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Lotes"
              fullWidth
              value={selectedLotIdsDraft}
              onChange={(event) => {
                const value = event.target.value;
                const next =
                  typeof value === "string"
                    ? value
                        .split(",")
                        .map((id) => Number(id))
                        .filter((id) => Number.isFinite(id) && id > 0)
                    : (value as number[]);
                setSelectedLotIdsDraft(next);
              }}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as number[]).map((id) => {
                      const lot = lotsOptions.find((option) => option.id === id);
                      return (
                        <Chip
                          key={id}
                          label={lot?.code || `Lote #${id}`}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                ),
              }}
              disabled={lotsOptionsLoading || lotsSaving}
              helperText={
                lotsSelectionError ||
                (lotsOptionsLoading ? "Cargando lotes..." : undefined)
              }
              error={Boolean(lotsSelectionError)}
            >
              {lotsOptions.map((lot) => (
                <MenuItem key={lot.id} value={lot.id}>
                  {lot.code || `Lote #${lot.id}`}
                </MenuItem>
              ))}
            </TextField>
            {lotsError && <Alert severity="error">{lotsError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCloseEditLots}
            disabled={lotsSaving}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveLots}
            disabled={lotsSaving || Boolean(lotsSelectionError)}
          >
            {lotsSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={statusSnackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={(event) => handleSnackbarClose(event)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Estado del ciclo actualizado correctamente
        </Alert>
      </Snackbar>

      <Snackbar
        open={datesSnackbarOpen}
        autoHideDuration={4000}
        onClose={handleDatesSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={(event) => handleDatesSnackbarClose(event)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Fechas del ciclo actualizadas correctamente
        </Alert>
      </Snackbar>

      <Snackbar
        open={lotsSnackbarOpen}
        autoHideDuration={4000}
        onClose={handleLotsSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={(event) => handleLotsSnackbarClose(event)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Lotes actualizados correctamente
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CycleDetailPageClient;
