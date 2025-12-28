"use client";

import * as React from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import CropChip from "@/app/(DashboardLayout)/components/shared/CropChip";
import StockDialog, {
  type StockFormValues,
  type StockDialogMode,
} from "@/app/(DashboardLayout)/components/stock/StockDialog";
import TruckTripDialog, {
  type TruckTripFormValues,
  type TruckTripDialogMode,
  getDefaultTruckTripFormValues,
} from "@/app/(DashboardLayout)/components/truckTrips/TruckTripDialog";
import SimpleEntityDialogForm, {
  SimpleEntityDialogFieldConfig,
  SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import type { HarvestDto } from "@/lib/baserow/harvests";
import {
  combineDateAndTimeToIso,
  splitIsoToDateAndTimeLocal,
} from "@/lib/forms/datetime";
import { findMatchingFieldOption } from "@/lib/fields/fieldMatching";

type CosechasPageClientProps = {
  initialHarvests: HarvestDto[];
  stockUnitTypeOptions: SelectOption[];
  stockStatusOptions: SelectOption[];
};

/* --------- Helpers --------- */

type HarvestFormValues = {
  Fecha_fecha: string; // YYYY-MM-DD (input date)
  Fecha_hora: string; // HH:mm (input time)
  "KG Cosechados": string;

  Campo: "" | number;
  Lotes: Array<string | number>;
  "Ciclo de siembra": "" | number;

  Cultivo: string; // readonly
  Stock: Array<string | number>;
  "Viajes camión directos": Array<string | number>;

  Notas: string;
};

const formatDateTimeParts = (
  value: string | null,
): { date: string; time: string } => {
  if (!value) return { date: "—", time: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value ?? "—", time: "" };

  return {
    date: date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
    time: date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const formatKgs = (value: number): string =>
  (value || 0).toLocaleString("es-ES", {
    maximumFractionDigits: 0,
  });

const getDefaultHarvestFormValues = (): HarvestFormValues => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());

  return {
    Fecha_fecha: `${yyyy}-${mm}-${dd}`,
    Fecha_hora: `${hh}:${min}`,
    "KG Cosechados": "",
    Campo: "",
    Lotes: [],
    "Ciclo de siembra": "",
    Cultivo: "",
    Stock: [],
    "Viajes camión directos": [],
    Notas: "",
  };
};

const normalizeArrayForComparison = (arr: unknown[]) => {
  if (!arr.length) return [];

  if (arr.every((value) => typeof value === "number")) {
    return [...arr].sort(
      (a, b) => (Number(a) || 0) - (Number(b) || 0),
    ) as number[];
  }

  if (arr.every((value) => typeof value === "string")) {
    return [...arr]
      .map((value) => String(value))
      .sort((a, b) => a.localeCompare(b));
  }

  return [...arr];
};

const isEqualValue = (a: unknown, b: unknown) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const normalizedA = normalizeArrayForComparison(a);
    const normalizedB = normalizeArrayForComparison(b);
    return normalizedA.every((value, index) => value === normalizedB[index]);
  }

  return a === b;
};

const computeDiffPayload = (
  prevPayload: Record<string, any>,
  nextPayload: Record<string, any>,
) => {
  const diff: Record<string, any> = {};

  Object.keys(nextPayload).forEach((key) => {
    if (!isEqualValue(prevPayload[key], nextPayload[key])) {
      diff[key] = nextPayload[key];
    }
  });

  return diff;
};

const ensureArray = <T,>(value: T[] | undefined | null): T[] =>
  Array.isArray(value) ? value : [];

const parseNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeHarvestFormToBaserowPayload = (
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean },
) => {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;

  const payload: Record<string, any> = {
    Fecha: combineDateAndTimeToIso(
      formValues["Fecha_fecha"],
      formValues["Fecha_hora"],
    ),
  };

  const rawKgs = formValues["KG Cosechados"];
  const harvestedKgs = parseFloat(rawKgs);
  if (Number.isNaN(harvestedKgs)) {
    throw new Error("Ingresá un número válido para los kilos cosechados");
  }
  payload["KG Cosechados"] = harvestedKgs;

  const lotsValue = Array.isArray(formValues.Lotes) ? formValues.Lotes : [];
  const lotIds = lotsValue
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  if (!lotIds.length) {
    throw new Error("Seleccioná al menos un lote");
  }
  payload.Lotes = lotIds;

  const cycleValue = formValues["Ciclo de siembra"];
  const cycleId = Number(cycleValue);
  if (!cycleId || Number.isNaN(cycleId)) {
    throw new Error("Seleccioná un ciclo de siembra válido");
  }
  payload["Ciclo de siembra"] = [cycleId];

  const stockValues = Array.isArray(formValues.Stock)
    ? formValues.Stock
    : formValues.Stock
      ? [formValues.Stock]
      : [];
  const stockIds = stockValues
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value) && value > 0);
  if (stockIds.length) {
    payload.Stock = stockIds;
  } else if (includeEmptyOptional) {
    payload.Stock = [];
  }

  const tripValues = Array.isArray(formValues["Viajes camión directos"])
    ? formValues["Viajes camión directos"]
    : formValues["Viajes camión directos"]
      ? [formValues["Viajes camión directos"]]
      : [];
  const tripIds = tripValues
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value) && value > 0);
  if (tripIds.length) {
    payload["Viajes camión directos"] = tripIds;
  } else if (includeEmptyOptional) {
    payload["Viajes camión directos"] = [];
  }

  const notesValue = (formValues["Notas"] ?? "").trim();
  if (notesValue || includeEmptyOptional) {
    payload.Notas = notesValue;
  }

  return payload;
};

const normalizeHarvestDtoToBaserowPayload = (harvest: HarvestDto) => {
  const payload: Record<string, any> = {};

  if (harvest.date) {
    const parsedDate = new Date(harvest.date);
    if (!Number.isNaN(parsedDate.getTime())) {
      payload.Fecha = parsedDate.toISOString();
    }
  }

  payload["KG Cosechados"] =
    typeof harvest.harvestedKgs === "number" ? harvest.harvestedKgs : 0;

  payload.Lotes = Array.isArray(harvest.lotsIds) ? [...harvest.lotsIds] : [];

  const cycleId =
    typeof harvest.cycleId === "number" && !Number.isNaN(harvest.cycleId)
      ? harvest.cycleId
      : null;

  payload["Ciclo de siembra"] = cycleId ? [cycleId] : [];

  payload.Stock = Array.isArray(harvest.stockIds)
    ? harvest.stockIds.filter(
        (id): id is number => typeof id === "number" && !Number.isNaN(id),
      )
    : [];

  payload["Viajes camión directos"] = Array.isArray(harvest.directTruckTripIds)
    ? harvest.directTruckTripIds.filter(
        (id): id is number => typeof id === "number" && !Number.isNaN(id),
      )
    : [];

  const notesValue =
    typeof harvest.notes === "string" ? harvest.notes.trim() : "";
  payload.Notas = notesValue;

  return payload;
};

const buildHarvestInitialValues = (harvest: HarvestDto): HarvestFormValues => {
  const { date, time } = splitIsoToDateAndTimeLocal(harvest.date);
  const { date: todayDate, time: todayTime } = splitIsoToDateAndTimeLocal(
    new Date().toISOString(),
  );

  return {
    Fecha_fecha: date || todayDate,
    Fecha_hora: time || todayTime,
    "KG Cosechados":
      harvest.harvestedKgs != null ? String(harvest.harvestedKgs) : "",

    Campo: ((harvest as any).fieldId ?? "") as "" | number,
    Lotes: (harvest.lotsIds ?? []) as Array<string | number>,
    "Ciclo de siembra": (harvest.cycleId ?? "") as "" | number,

    Cultivo: harvest.crop ?? "",
    Stock: (harvest.stockIds ?? []) as Array<string | number>,
    "Viajes camión directos": (harvest.directTruckTripIds ?? []) as Array<
      string | number
    >,

    Notas: harvest.notes ?? "",
  };
};

type SelectOption = {
  id: number;
  label: string;
};

type CycleOption = SelectOption & {
  crop: string;
};

type FieldDependencies = {
  lots: SelectOption[];
  cycles: CycleOption[];
  stocks: SelectOption[];
  truckTrips: SelectOption[];
};

const emptyDependencies: FieldDependencies = {
  lots: [],
  cycles: [],
  stocks: [],
  truckTrips: [],
};

type DialogOption = {
  label: string;
  value: string | number;
  meta?: Record<string, any>;
};

const mergeDialogOptions = (
  primary: DialogOption[],
  fallback: DialogOption[],
): DialogOption[] => {
  if (!fallback.length) return primary;
  const seen = new Set(primary.map((option) => String(option.value)));
  const merged = [...primary];
  fallback.forEach((option) => {
    const key = String(option.value);
    if (seen.has(key)) return;
    merged.push(option);
    seen.add(key);
  });
  return merged;
};

const buildFallbackOptions = (
  ids: Array<string | number> | undefined,
  labels: Array<string | undefined> | undefined,
  fallbackLabel: (value: number) => string,
): DialogOption[] => {
  if (!Array.isArray(ids) || !ids.length) return [];
  return ids.reduce<DialogOption[]>((acc, rawId, index) => {
    const normalizedId = Number(rawId);
    if (!normalizedId || Number.isNaN(normalizedId)) {
      return acc;
    }
    const rawLabel = labels?.[index];
    const label =
      typeof rawLabel === "string" && rawLabel.trim()
        ? rawLabel.trim()
        : fallbackLabel(normalizedId);
    acc.push({
      value: normalizedId,
      label,
    });
    return acc;
  }, []);
};

const buildFallbackCycleOption = (
  cycleId: number | null | undefined,
  params: { label?: string | null; crop?: string | null },
): DialogOption[] => {
  const normalizedId = Number(cycleId);
  if (!normalizedId || Number.isNaN(normalizedId)) return [];
  const label = (typeof params.label === "string" && params.label.trim()) || "";
  return [
    {
      value: normalizedId,
      label: label || `Ciclo #${normalizedId}`,
      meta: { crop: params.crop ?? "" },
    },
  ];
};

const buildInlineStockDefaultValues = (
  unitTypeOptions: SelectOption[],
  statusOptions: SelectOption[],
  params: { campoId: number | ""; cycleId: number | ""; cultivo?: string },
): StockFormValues => {
  const todayString = new Date().toISOString().slice(0, 10);
  return {
    "Tipo unidad": unitTypeOptions[0]?.id ?? "",
    Campo: params.campoId,
    "Ciclo de siembra": params.cycleId ?? "",
    Cultivo: params.cultivo ?? "",
    "Fecha de creación": todayString,
    Estado: statusOptions[0]?.id ?? "",
    Notas: "",
    ID: "",
    "Kgs actuales": "—",
    "Total kgs ingresados": "—",
    "Total kgs egresados": "—",
    "Cosechas asociadas": [],
    "Viajes de camión desde stock": [],
  };
};

/* --------- Component --------- */

const CosechasPageClient = ({
  initialHarvests,
  stockUnitTypeOptions,
  stockStatusOptions,
}: CosechasPageClientProps) => {
  const router = useRouter();
  const [periodFilter, setPeriodFilter] = React.useState<string>("all");
  const [fieldFilter, setFieldFilter] = React.useState<string>("all");
  const [cropFilter, setCropFilter] = React.useState<string>("all");
  const [cycleFilter, setCycleFilter] = React.useState<string>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [activeHarvest, setActiveHarvest] = React.useState<HarvestDto | null>(
    null,
  );
  const [snackbarState, setSnackbarState] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<HarvestFormValues>(getDefaultHarvestFormValues);
  const [dialogCurrentValues, setDialogCurrentValues] =
    React.useState<HarvestFormValues>(getDefaultHarvestFormValues);
  const dialogCurrentValuesRef =
    React.useRef<HarvestFormValues>(dialogCurrentValues);

  React.useEffect(() => {
    dialogCurrentValuesRef.current = dialogCurrentValues;
  }, [dialogCurrentValues]);

  const [dialogValuesPatch, setDialogValuesPatch] = React.useState<{
    data: Partial<HarvestFormValues>;
    key: number;
  } | null>(null);
  const dialogPatchKeyRef = React.useRef(0);
  const inlineStockContextRef = React.useRef<{
    field: SelectOption;
    cycleId: number;
  } | null>(null);
  const inlineTripContextRef = React.useRef<{
    fieldId: number;
    fieldLabel?: string;
  } | null>(null);
  const preserveTripContextOnCloseRef = React.useRef(false);
  const [fieldOptions, setFieldOptions] = React.useState<SelectOption[]>([]);
  const [fieldOptionsLoading, setFieldOptionsLoading] = React.useState(false);
  const [dependenciesCache, setDependenciesCache] = React.useState<
    Record<number, FieldDependencies>
  >({});
  const dependenciesCacheRef = React.useRef(dependenciesCache);
  const inflightFieldFetchRef = React.useRef<Set<number>>(new Set());
  const [dependenciesLoading, setDependenciesLoading] = React.useState(false);
  const [dependenciesError, setDependenciesError] = React.useState<
    string | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [stockDialogOpen, setStockDialogOpen] = React.useState(false);
  const [stockDialogInitialValues, setStockDialogInitialValues] =
    React.useState<StockFormValues>(() =>
      buildInlineStockDefaultValues(stockUnitTypeOptions, stockStatusOptions, {
        campoId: "",
        cycleId: "",
      }),
    );
  const [tripDialogOpen, setTripDialogOpen] = React.useState(false);
  const [tripDialogInitialValues, setTripDialogInitialValues] =
    React.useState<TruckTripFormValues | null>(null);

  const selectedFieldId = React.useMemo(
    () => parseNumericId(dialogCurrentValues.Campo),
    [dialogCurrentValues.Campo],
  );

  const selectedFieldOption = React.useMemo(() => {
    if (!selectedFieldId) return null;
    const match =
      fieldOptions.find((option) => option.id === selectedFieldId) ?? null;
    if (match) return match;
    const fallbackLabel =
      (activeHarvest &&
        activeHarvest.fieldId === selectedFieldId &&
        activeHarvest.field) ||
      undefined;
    return {
      id: selectedFieldId,
      label: fallbackLabel ? fallbackLabel : `Campo #${selectedFieldId}`,
    };
  }, [activeHarvest, fieldOptions, selectedFieldId]);
  const selectedFieldLabel = selectedFieldOption?.label;

  const showToast = React.useCallback(
    (message: string, severity: "success" | "error" | "info") => {
      setSnackbarState({
        open: true,
        message,
        severity,
      });
    },
    [],
  );

  const applyDialogValuePatch = React.useCallback(
    (data: Partial<HarvestFormValues>) => {
      setDialogCurrentValues((prev) => ({ ...prev, ...data }));
      dialogPatchKeyRef.current += 1;
      setDialogValuesPatch({
        data,
        key: dialogPatchKeyRef.current,
      });
    },
    [],
  );

  const currentDependencies = React.useMemo(() => {
    if (!selectedFieldId) return emptyDependencies;
    return dependenciesCache[selectedFieldId] ?? emptyDependencies;
  }, [dependenciesCache, selectedFieldId]);

  React.useEffect(() => {
    dependenciesCacheRef.current = dependenciesCache;
  }, [dependenciesCache]);

  const fetchFieldOptions = React.useCallback(async (): Promise<
    SelectOption[]
  > => {
    let fields: SelectOption[] = [];
    try {
      setFieldOptionsLoading(true);
      const response = await fetch("/api/harvests/options", {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          errorBody || "No se pudieron cargar los campos disponibles",
        );
      }

      const data = (await response.json()) as { fields?: SelectOption[] };
      fields = Array.isArray(data.fields) ? data.fields : [];
      setFieldOptions(fields);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al cargar la lista de campos";
      showToast(message, "error");
      fields = [];
    } finally {
      setFieldOptionsLoading(false);
    }
    return fields;
  }, [showToast]);

  const inflightCountRef = React.useRef(0);

  const fetchFieldDependencies = React.useCallback(
    async (
      fieldId: number,
      fieldLabel?: string,
      options?: { force?: boolean },
    ) => {
      if (!fieldId) return;
      if (!options?.force && dependenciesCacheRef.current[fieldId]) return;
      if (!options?.force && inflightFieldFetchRef.current.has(fieldId)) return;

      try {
        inflightFieldFetchRef.current.add(fieldId);

        inflightCountRef.current += 1;
        setDependenciesLoading(true);
        setDependenciesError(null);
        const params = new URLSearchParams({
          campoId: String(fieldId),
        });
        if (fieldLabel) {
          params.set("campoName", fieldLabel);
        }
        const response = await fetch(`/api/harvests/options?${params}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            errorBody ||
              "No se pudieron cargar las opciones para el campo seleccionado",
          );
        }

        const data = (await response.json()) as {
          lots?: SelectOption[];
          cycles?: CycleOption[];
          stocks?: SelectOption[];
          truckTrips?: SelectOption[];
        };
        setDependenciesCache((prev) => ({
          ...prev,
          [fieldId]: {
            lots: Array.isArray(data.lots) ? data.lots : [],
            cycles: Array.isArray(data.cycles) ? data.cycles : [],
            stocks: Array.isArray(data.stocks) ? data.stocks : [],
            truckTrips: Array.isArray(data.truckTrips) ? data.truckTrips : [],
          },
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar las opciones dependientes";
        setDependenciesError(message);
        showToast(message, "error");
      } finally {
        inflightFieldFetchRef.current.delete(fieldId);

        inflightCountRef.current -= 1;
        if (inflightCountRef.current <= 0) {
          inflightCountRef.current = 0;
          setDependenciesLoading(false);
        }
      }
    },
    [showToast],
  );

  React.useEffect(() => {
    if (dialogOpen && !fieldOptions.length && !fieldOptionsLoading) {
      fetchFieldOptions();
    }
  }, [dialogOpen, fieldOptions.length, fieldOptionsLoading, fetchFieldOptions]);

  React.useEffect(() => {
    if (!dialogOpen) return;
    if (!selectedFieldId) {
      setDependenciesError(null);
      return;
    }
    setDependenciesError(null);
    void fetchFieldDependencies(selectedFieldId, selectedFieldLabel);
  }, [dialogOpen, fetchFieldDependencies, selectedFieldId, selectedFieldLabel]);

  const handleDialogFieldChange = React.useCallback(
    (_key: string, _rawValue: any, values?: Record<string, any>) => {
      if (values) {
        setDialogCurrentValues(values as HarvestFormValues);
      }
    },
    [],
  );

  const openEditDialog = React.useCallback(
    async (harvest: HarvestDto) => {
      setDialogMode("edit");
      setActiveHarvest(harvest);
      setDependenciesError(null);

      let availableFields = fieldOptions;
      if (!availableFields.length) {
        availableFields = await fetchFieldOptions();
      }

      const harvestInitialValues = buildHarvestInitialValues(harvest);

      const matchedField =
        findMatchingFieldOption(availableFields, {
          id: (
            harvest as HarvestDto & {
              fieldId?: number | null;
            }
          ).fieldId,
          label: harvest.field,
        }) ?? null;

      harvestInitialValues.Campo = matchedField ? matchedField.id : "";

      if (matchedField && !dependenciesCacheRef.current[matchedField.id]) {
        await fetchFieldDependencies(matchedField.id, matchedField.label);
      }

      setDialogInitialValues(harvestInitialValues);
      setDialogCurrentValues(harvestInitialValues);
      setDialogValuesPatch(null);
      setStockDialogOpen(false);
      inlineStockContextRef.current = null;

      setDialogOpen(true);
    },
    [fetchFieldDependencies, fetchFieldOptions, fieldOptions],
  );

  const handleOpenCreateDialog = React.useCallback(() => {
    setDialogMode("create");
    setActiveHarvest(null);
    const defaults = getDefaultHarvestFormValues();
    setDialogInitialValues(defaults);
    setDialogCurrentValues(defaults);
    setDialogValuesPatch(null);
    setDependenciesError(null);
    setStockDialogOpen(false);
    setTripDialogOpen(false);
    setTripDialogInitialValues(null);
    inlineStockContextRef.current = null;
    inlineTripContextRef.current = null;
    setDialogOpen(true);
  }, []);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode("create");
    setActiveHarvest(null);
    setDependenciesError(null);
    const defaults = getDefaultHarvestFormValues();
    setDialogInitialValues(defaults);
    setDialogCurrentValues(defaults);
    setDialogValuesPatch(null);
    setDeleteConfirmOpen(false);
    setDeleteLoading(false);
    setStockDialogOpen(false);
    inlineStockContextRef.current = null;
    setTripDialogOpen(false);
    setTripDialogInitialValues(null);
    inlineTripContextRef.current = null;
    setDependenciesLoading(false);
    inflightCountRef.current = 0;
    inflightFieldFetchRef.current.clear();
  }, []);

  const selectedCycleId = parseNumericId(
    dialogCurrentValues["Ciclo de siembra"],
  );
  const campoIdForActions = selectedFieldId;
  const campoOptionForActions = selectedFieldOption;

  const canCreateInlineStock =
    Boolean(selectedFieldId) && Boolean(selectedCycleId);
  const canCreateInlineTruckTrip =
    Boolean(campoIdForActions) && Boolean(selectedCycleId);

  const handleOpenInlineStockDialog = React.useCallback(() => {
    if (!selectedFieldOption || !selectedCycleId) return;
    const cycleMatch = currentDependencies.cycles.find(
      (cycle) => cycle.id === selectedCycleId,
    );
    inlineStockContextRef.current = {
      field: selectedFieldOption,
      cycleId: selectedCycleId,
    };
    const initialValues = buildInlineStockDefaultValues(
      stockUnitTypeOptions,
      stockStatusOptions,
      {
        campoId: selectedFieldOption.id,
        cycleId: selectedCycleId,
        cultivo: cycleMatch?.crop ?? dialogCurrentValues.Cultivo ?? "",
      },
    );
    setStockDialogInitialValues(initialValues);
    setStockDialogOpen(true);
  }, [
    currentDependencies.cycles,
    dialogCurrentValues,
    selectedCycleId,
    selectedFieldOption,
    stockStatusOptions,
    stockUnitTypeOptions,
  ]);

  const handleStockDialogClose = React.useCallback(() => {
    inlineStockContextRef.current = null;
    setStockDialogOpen(false);
  }, []);

  const handleStockDialogSuccess = React.useCallback(
    (result: { mode: StockDialogMode; stockId?: number }) => {
      setStockDialogOpen(false);
      void (async () => {
        if (result.mode !== "create") return;
        const { stockId } = result;
        const context = inlineStockContextRef.current;
        inlineStockContextRef.current = null;
        if (!stockId || !context) return;
        const { field } = context;
        const normalizedStockId = Number(stockId);
        if (!normalizedStockId || Number.isNaN(normalizedStockId)) return;

        setDependenciesCache((prev) => {
          const next = { ...prev };
          delete next[field.id];
          return next;
        });

        await fetchFieldDependencies(field.id, field.label, { force: true });

        setDialogCurrentValues((prev) => {
          const prevCampoId = parseNumericId(prev.Campo);
          if (prevCampoId !== field.id) {
            return prev;
          }
          const prevStocks = Array.isArray(prev.Stock) ? prev.Stock : [];
          const alreadyExists = prevStocks.some(
            (value) => Number(value) === normalizedStockId,
          );
          if (alreadyExists) return prev;
          const updatedStocks = [...prevStocks, normalizedStockId];
          applyDialogValuePatch({ Stock: updatedStocks });
          return {
            ...prev,
            Stock: updatedStocks,
          } as HarvestFormValues;
        });
      })();
    },
    [applyDialogValuePatch, fetchFieldDependencies, setDependenciesCache],
  );

  const handleOpenInlineTruckTripDialog = React.useCallback(() => {
    if (dialogMode !== "edit") return;
    if (!campoIdForActions || !selectedCycleId) return;
    const defaults = getDefaultTruckTripFormValues();
    const cycleMatch = currentDependencies.cycles.find(
      (cycle) => cycle.id === selectedCycleId,
    );
    const initialValues: TruckTripFormValues = {
      ...defaults,
      "Campo origen": campoIdForActions,
      "Tipo origen": "harvest",
      Origen:
        dialogMode === "edit" && activeHarvest?.id ? activeHarvest?.id : "",
      Origen_label:
        dialogMode === "edit" && activeHarvest?.id
          ? activeHarvest?.harvestId
          : `Cosecha #${activeHarvest?.id ?? ""}`,
      "Ciclo de siembra": activeHarvest?.cycleLabel ?? cycleMatch?.label ?? "",
      "Kg carga origen": dialogCurrentValues["KG Cosechados"] ?? "",
    };
    inlineTripContextRef.current = {
      fieldId: campoIdForActions,
      fieldLabel: campoOptionForActions?.label || `Campo #${campoIdForActions}`,
    };
    preserveTripContextOnCloseRef.current = false;
    setTripDialogInitialValues(initialValues);
    setTripDialogOpen(true);
  }, [
    activeHarvest,
    campoIdForActions,
    campoOptionForActions,
    currentDependencies.cycles,
    dialogCurrentValues,
    dialogMode,
    selectedCycleId,
  ]);

  const handleTripDialogClose = React.useCallback(() => {
    if (!preserveTripContextOnCloseRef.current) {
      inlineTripContextRef.current = null;
    }
    setTripDialogOpen(false);
    setTripDialogInitialValues(null);
  }, []);

  const handleTripDialogSuccess = React.useCallback(
    (result: {
      mode: TruckTripDialogMode;
      tripId?: number;
      tripLabel?: string;
    }) => {
      preserveTripContextOnCloseRef.current = true;
      setTripDialogOpen(false);
      void (async () => {
        try {
          if (result.mode !== "create") return;
          const { tripId } = result;
          const context = inlineTripContextRef.current;
          if (!tripId || !context) return;
          const normalizedTripId = Number(tripId);
          if (!normalizedTripId || Number.isNaN(normalizedTripId)) return;
          const resolvedLabel =
            (typeof result.tripLabel === "string" && result.tripLabel.trim()) ||
            `Viaje #${normalizedTripId}`;

          setDependenciesCache((prev) => {
            const next = { ...prev };
            delete next[context.fieldId];
            return next;
          });

          await fetchFieldDependencies(context.fieldId, context.fieldLabel, {
            force: true,
          });

          setDialogCurrentValues((prev) => {
            const prevCampoId = parseNumericId(prev.Campo);
            if (!prevCampoId || prevCampoId !== context.fieldId) {
              return prev;
            }

            const prevTrips = Array.isArray(prev["Viajes camión directos"])
              ? prev["Viajes camión directos"]
              : [];

            if (prevTrips.some((v) => Number(v) === normalizedTripId)) {
              return prev;
            }

            const updatedTrips = [...prevTrips, normalizedTripId];
            applyDialogValuePatch({ "Viajes camión directos": updatedTrips });
            return {
              ...prev,
              "Viajes camión directos": updatedTrips,
            } as HarvestFormValues;
          });
        } finally {
          inlineTripContextRef.current = null;
          preserveTripContextOnCloseRef.current = false;
        }
      })();
    },
    [applyDialogValuePatch, fetchFieldDependencies, setDependenciesCache],
  );

  const harvestFormSections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: "Información básica",
        description: "Fecha y cantidad total cosechada",

        fields: ["Fecha_fecha", "Fecha_hora", "KG Cosechados"],
      },
      {
        title: "Ubicación y origen",
        description: "Campo, lotes y ciclo de donde proviene la cosecha",

        fields: ["Campo", "Lotes", "Ciclo de siembra", "Cultivo"],
      },
      {
        title: "Distribución",
        description: "Stock y viajes directos asociados (opcional)",

        fields: ["Stock", "Viajes camión directos"],
      },
      {
        title: "Notas",
        description: "Observaciones y detalles extras",

        fields: ["Notas"],
      },
    ],
    [],
  );

  const harvestFormFields = React.useMemo<
    SimpleEntityDialogFieldConfig[]
  >(() => {
    const campoOptions: DialogOption[] = fieldOptions.map((field) => ({
      label: field.label,
      value: field.id,
    }));

    const baseLotsOptions: DialogOption[] = currentDependencies.lots.map(
      (lot) => ({
        label: lot.label,
        value: lot.id,
      }),
    );
    const fallbackLotsOptions = activeHarvest
      ? buildFallbackOptions(
          activeHarvest.lotsIds,
          activeHarvest.lotsLabels,
          (id) => `Lote #${id}`,
        )
      : [];
    const lotsOptions = mergeDialogOptions(
      baseLotsOptions,
      fallbackLotsOptions,
    );

    const baseCycleOptions: DialogOption[] = currentDependencies.cycles.map(
      (cycle) => ({
        label: cycle.label,
        value: cycle.id,
        meta: { crop: cycle.crop },
      }),
    );
    const fallbackCycleOptions = activeHarvest
      ? buildFallbackCycleOption(activeHarvest.cycleId, {
          label: activeHarvest.cycleLabel,
          crop: activeHarvest.crop,
        })
      : [];
    const cycleOptions = mergeDialogOptions(
      baseCycleOptions,
      fallbackCycleOptions,
    );

    const baseStockOptions: DialogOption[] = currentDependencies.stocks.map(
      (stock) => ({
        label: stock.label,
        value: stock.id,
      }),
    );
    const fallbackStockOptions = activeHarvest
      ? buildFallbackOptions(
          activeHarvest.stockIds,
          activeHarvest.stockLabels,
          (id) => `Stock #${id}`,
        )
      : [];
    const stockOptions = mergeDialogOptions(
      baseStockOptions,
      fallbackStockOptions,
    );

    const baseTruckOptions: DialogOption[] = currentDependencies.truckTrips.map(
      (trip) => ({
        label: trip.label,
        value: trip.id,
      }),
    );
    const fallbackTruckOptions = activeHarvest
      ? buildFallbackOptions(
          activeHarvest.directTruckTripIds,
          activeHarvest.directTruckLabels,
          (id) => `Viaje #${id}`,
        )
      : [];
    const truckOptions = mergeDialogOptions(
      baseTruckOptions,
      fallbackTruckOptions,
    );

    const dependentHelperText = selectedFieldId
      ? (dependenciesError ?? undefined)
      : "Seleccioná un campo primero";

    const dependentDisabled = !selectedFieldId || dependenciesLoading;

    const inlineStockDisabled = !canCreateInlineStock || dependenciesLoading;
    const stockHelperMessage =
      dependentHelperText ??
      "Opcional: asociar esta cosecha a uno o más stocks existentes";
    const stockHelperContent = (
      <Stack spacing={0.5} alignItems="flex-start">
        <Button
          variant="text"
          size="small"
          disabled={inlineStockDisabled}
          onClick={handleOpenInlineStockDialog}
          sx={{ px: 0, textTransform: "none" }}
        >
          + Nuevo stock
        </Button>
      </Stack>
    );
    const truckHelperMessage = dependentHelperText
      ? dependentHelperText
      : dialogMode === "edit"
        ? "Opcional: asociá viajes directos desde campo"
        : "Guardá la cosecha antes de agregar viajes directos";
    const truckHelperContent =
      dialogMode === "edit" ? (
        <Stack spacing={0.5} alignItems="flex-start">
          <Typography variant="caption" color="text.secondary">
            {truckHelperMessage}
          </Typography>
          <Button
            variant="text"
            size="small"
            disabled={!canCreateInlineTruckTrip || dependenciesLoading}
            onClick={handleOpenInlineTruckTripDialog}
            sx={{ px: 0, textTransform: "none" }}
          >
            + Nuevo viaje de camión
          </Button>
        </Stack>
      ) : undefined;

    return [
      {
        key: "Fecha_fecha",
        label: "Fecha",
        type: "date",
        required: true,
      },
      {
        key: "Fecha_hora",
        label: "Hora",
        type: "time",
        required: true,
      },
      {
        key: "KG Cosechados",
        label: "Kilos cosechados",
        type: "number",
        required: true,
        step: 0.01,
        placeholder: "0.00",
      },
      {
        key: "Campo",
        label: "Campo",
        type: "select",
        required: true,
        options: campoOptions,
        loading: fieldOptionsLoading,
        onValueChange: () => ({
          Lotes: [],
          "Ciclo de siembra": "",
          Cultivo: "",
          Stock: [],
          "Viajes camión directos": [],
        }),
      },
      {
        key: "Lotes",
        label: "Lotes",
        type: "multi-select",
        required: true,
        options: lotsOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
      },
      {
        key: "Ciclo de siembra",
        label: "Ciclo de siembra",
        type: "select",
        required: true,
        options: cycleOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,

        onValueChange: (value) => {
          const cycle = cycleOptions.find((option) => option.value === value);
          return {
            Cultivo: cycle?.meta?.crop ?? "",
          };
        },
      },
      {
        key: "Cultivo",
        label: "Cultivo",
        type: "readonly",
        helperText: "Se completa automáticamente según el ciclo elegido",
      },
      {
        key: "Stock",
        label: "Stock",
        labelNode: (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Stock</span>
          </Box>
        ),
        type: "multi-select",
        options: stockOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: stockHelperMessage,
        helperContent: stockHelperContent,
      },
      {
        key: "Viajes camión directos",
        label: "Viajes de camión",
        labelNode: (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Viajes de camión</span>
          </Box>
        ),
        type: "multi-select",
        options: truckOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
        helperContent: truckHelperContent,
      },
      {
        key: "Notas",
        label: "Notas",
        type: "textarea",
      },
    ];
  }, [
    currentDependencies.cycles,
    currentDependencies.lots,
    currentDependencies.stocks,
    currentDependencies.truckTrips,
    activeHarvest,
    dialogCurrentValues,
    dependenciesError,
    dependenciesLoading,
    fieldOptions,
    fieldOptionsLoading,
    handleOpenInlineTruckTripDialog,
    handleOpenInlineStockDialog,
    canCreateInlineStock,
    canCreateInlineTruckTrip,
    selectedFieldId,
    dialogMode,
  ]);

  const uniquePeriods = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests
            .map((h) => (h.period ?? "").trim())
            .filter((p) => Boolean(p)),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [initialHarvests],
  );

  const uniqueCycles = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests
            .map((h) => h.cycleLabel?.trim() || "")
            .filter((v) => Boolean(v)),
        ),
      ).sort(),
    [initialHarvests],
  );

  const uniqueFields = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests.map((h) => h.field).filter((field) => Boolean(field)),
        ),
      ).sort(),
    [initialHarvests],
  );

  const uniqueCrops = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests.map((h) => h.crop).filter((crop) => Boolean(crop)),
        ),
      ).sort(),
    [initialHarvests],
  );

  const filteredHarvests = React.useMemo(() => {
    return initialHarvests.filter((harvest) => {
      const period = (harvest.period ?? "").trim();
      if (periodFilter !== "all" && period !== periodFilter) return false;
      if (fieldFilter !== "all" && harvest.field !== fieldFilter) return false;
      if (cropFilter !== "all" && harvest.crop !== cropFilter) return false;
      if (cycleFilter !== "all") {
        const cycleLabel = harvest.cycleLabel?.trim() || "";
        if (cycleLabel !== cycleFilter) return false;
      }

      return true;
    });
  }, [initialHarvests, periodFilter, fieldFilter, cropFilter, cycleFilter]);

  const sortedHarvests = React.useMemo(() => {
    return [...filteredHarvests].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredHarvests]);

  const totals = React.useMemo(() => {
    return sortedHarvests.reduce(
      (acc, harvest) => {
        const harvestedKgs = Number(harvest.harvestedKgs) || 0;
        const directTruckKgs = Number(harvest.directTruckKgs) || 0;
        const stockKgs = Number(harvest.stockKgs) || 0;
        acc.totalHarvestedKgs += harvestedKgs;
        acc.totalDirectTruckKgs += directTruckKgs;
        acc.totalToStockKgs += stockKgs;
        acc.harvestCount += 1;
        return acc;
      },
      {
        totalHarvestedKgs: 0,
        totalDirectTruckKgs: 0,
        totalToStockKgs: 0,
        harvestCount: 0,
      },
    );
  }, [sortedHarvests]);

  const handleCreateSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      const payload = normalizeHarvestFormToBaserowPayload(formValues);
      const response = await fetch("/api/harvests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo registrar la cosecha";
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error || errorBody;
          } catch {
            message = errorBody;
          }
        }
        showToast(message, "error");
        throw new Error(message);
      }

      showToast("Cosecha registrada correctamente", "success");
      router.refresh();
    },
    [router, showToast],
  );

  const handleEditSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      if (!activeHarvest) {
        throw new Error("No se encontró la cosecha a editar");
      }

      const nextPayload = normalizeHarvestFormToBaserowPayload(formValues, {
        includeEmptyOptional: true,
      });
      const prevPayload = normalizeHarvestDtoToBaserowPayload(activeHarvest);
      const diffPayload = computeDiffPayload(prevPayload, nextPayload);

      if (!Object.keys(diffPayload).length) {
        showToast("No hay cambios para guardar", "info");
        return;
      }

      const response = await fetch(`/api/harvests/${activeHarvest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: diffPayload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo actualizar la cosecha";
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error || errorBody;
          } catch {
            message = errorBody;
          }
        }
        showToast(message, "error");
        throw new Error(message);
      }

      showToast("Cosecha actualizada correctamente", "success");
      router.refresh();
    },
    [activeHarvest, router, showToast],
  );

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const openDeleteConfirm = React.useCallback(() => {
    if (!activeHarvest) return;
    setDeleteConfirmOpen(true);
  }, [activeHarvest]);

  const handleCloseDeleteConfirm = React.useCallback(() => {
    if (deleteLoading) return;
    setDeleteConfirmOpen(false);
  }, [deleteLoading]);

  const handleDeleteConfirmed = React.useCallback(async () => {
    if (!activeHarvest) {
      showToast("No se encontró la cosecha a borrar", "error");
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/harvests/${activeHarvest.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo borrar la cosecha";
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error || errorBody;
          } catch {
            message = errorBody;
          }
        }
        throw new Error(message);
      }

      showToast("Cosecha borrada correctamente", "success");
      setDeleteConfirmOpen(false);
      handleDialogClose();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al borrar la cosecha";
      showToast(message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [activeHarvest, handleDialogClose, router, showToast]);

  const editHarvestIdentifier =
    activeHarvest?.harvestId || (activeHarvest ? `#${activeHarvest.id}` : null);
  const dialogTitle =
    dialogMode === "create"
      ? "Registrar nueva cosecha"
      : editHarvestIdentifier
        ? `Editar cosecha ${editHarvestIdentifier}`
        : "Editar cosecha";
  const dialogSubmitHandler =
    dialogMode === "create" ? handleCreateSubmit : handleEditSubmit;

  return (
    <PageContainer
      title="Cosechas"
      description="Registro y distribución de kilos cosechados"
    >
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              background: "linear-gradient(135deg, #3A3184 0%, #6962A2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
              mb: 1,
            }}
          >
            Cosechas
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: "800px" }}
          >
            Registro y seguimiento de kilos cosechados, su distribución entre
            viajes directos y stock.
          </Typography>
        </Box>

        <DashboardCard>
          <Stack spacing={3}>
            <Box
              sx={(theme) => ({
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.03,
                )} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ alignItems: { xs: "stretch", md: "center" } }}
              >
                <FormControl fullWidth size="small">
                  <TextField
                    label="Período"
                    select
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniquePeriods.map((period) => (
                      <MenuItem key={period} value={period}>
                        {period}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Campo"
                    select
                    value={fieldFilter}
                    onChange={(event) => setFieldFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueFields.map((field) => (
                      <MenuItem key={field} value={field}>
                        {field}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Cultivo"
                    select
                    value={cropFilter}
                    onChange={(event) => setCropFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueCrops.map((crop) => (
                      <MenuItem key={crop} value={crop}>
                        {crop}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Ciclo de siembra"
                    select
                    value={cycleFilter}
                    onChange={(event) => setCycleFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueCycles.map((cycle) => (
                      <MenuItem key={cycle} value={cycle}>
                        {cycle}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
              </Stack>
            </Box>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                marginBottom: "2rem",
              }}
            >
              <Box
                sx={(theme) => ({
                  px: 2,
                  py: 1,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.12,
                  )}`,
                })}
              >
                <Typography
                  variant="body2"
                  color="primary.dark"
                  fontWeight={600}
                >
                  {filteredHarvests.length} cosecha
                  {filteredHarvests.length === 1 ? "" : "s"} registrada
                  {filteredHarvests.length === 1 ? "" : "s"}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  width: { xs: "100%", md: "auto" },
                  justifyContent: { xs: "space-between", md: "flex-end" },
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    boxShadow: (theme) =>
                      `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                    "&:hover": {
                      boxShadow: (theme) =>
                        `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                    },
                  }}
                  onClick={handleOpenCreateDialog}
                >
                  Nueva cosecha
                </Button>
                {/* <Button
                  variant="outlined"
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Exportar CSV
                </Button> */}
              </Stack>
            </Stack>

            {/* Desktop table */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 2,
                  width: "100%",
                  overflowX: "auto",
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.grey[500],
                    0.08,
                  )}`,
                })}
              >
                <Table size="small">
                  <TableHead
                    sx={(theme) => ({
                      background: `linear-gradient(135deg, ${alpha(
                        theme.palette.primary.main,
                        0.06,
                      )} 0%, ${alpha(theme.palette.primary.light, 0.06)} 100%)`,
                      "& .MuiTableCell-root": {
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                        borderBottom: `2px solid ${theme.palette.primary.main}`,
                        py: 1.5,
                        fontSize: "0.8rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      },
                    })}
                  >
                    <TableRow>
                      <TableCell>ID Cosecha</TableCell>
                      <TableCell>Cultivo</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Lotes</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell>Ciclo</TableCell>
                      <TableCell align="center">Stock asociado</TableCell>
                      <TableCell align="center">
                        Viajes de camión asociados
                      </TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell align="right">Kgs cosechados</TableCell>
                      <TableCell align="right">
                        Kgs ingresados a stock
                      </TableCell>
                      <TableCell align="right">
                        Kgs egresados en camión
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedHarvests.map((harvest, index) => {
                      const { date, time } = formatDateTimeParts(harvest.date);
                      const harvestId = harvest.harvestId || `#${harvest.id}`;
                      const lotsIds = ensureArray(harvest.lotsIds);
                      const lotsLabels = ensureArray(harvest.lotsLabels);
                      const stockIds = ensureArray(harvest.stockIds);
                      const stockLabels = ensureArray(harvest.stockLabels);
                      const directTripIds = ensureArray(
                        harvest.directTruckTripIds,
                      );
                      const directTripLabels = ensureArray(
                        harvest.directTruckLabels,
                      );

                      return (
                        <TableRow
                          key={harvest.id}
                          hover
                          onClick={() => {
                            void openEditDialog(harvest);
                          }}
                          sx={(theme) => ({
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            bgcolor:
                              index % 2 === 0
                                ? "transparent"
                                : alpha(theme.palette.grey[100], 0.4),
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                              transform: "scale(1.003)",
                              boxShadow: `0 2px 8px ${alpha(
                                theme.palette.primary.main,
                                0.1,
                              )}`,
                            },
                            "& .MuiTableCell-root": {
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              py: 1.5,
                            },
                          })}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {harvestId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <CropChip crop={harvest.crop} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {date}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {time || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {lotsIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {lotsIds.map((lid, i) => (
                                  <Chip
                                    key={lid}
                                    size="small"
                                    variant="outlined"
                                    label={lotsLabels[i] ?? `Lote ${lid}`}
                                    sx={{ fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08,
                              )}`,
                            })}
                          />
                          <TableCell>
                            <Typography
                              component={Link}
                              href={`/ciclos/${harvest.cycleId}`}
                              onClick={(event) => event.stopPropagation()}
                              sx={(theme) => ({
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                              })}
                            >
                              {harvest.cycleLabel || `Ciclo ${harvest.cycleId}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {stockIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {stockIds.map((sid, i) => (
                                  <Chip
                                    key={sid}
                                    size="small"
                                    variant="outlined"
                                    label={`${stockLabels[i] ?? `Stock ${sid}`}`}
                                    sx={{
                                      fontSize: "body2",
                                      fontWeight: 600,
                                      mb: 0.5,
                                    }}
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {directTripIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {directTripIds.map((tid, i) => (
                                  <Chip
                                    key={tid}
                                    size="small"
                                    variant="outlined"
                                    label={`${
                                      directTripLabels[i] ?? `Viaje ${tid}`
                                    }`}
                                    sx={{
                                      fontSize: "body2",
                                      fontWeight: 600,
                                      mb: 0.5,
                                    }}
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08,
                              )}`,
                            })}
                          />
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={700}>
                              {formatKgs(Number(harvest.harvestedKgs) || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {formatKgs(Number(harvest.stockKgs) || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {formatKgs(Number(harvest.directTruckKgs) || 0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow
                      sx={(theme) => ({
                        background: theme.palette.grey.A100,
                        "& .MuiTableCell-root": {
                          borderTop: `2px solid ${theme.palette.grey[300]}`,
                          fontWeight: 800,
                          color: theme.palette.primary.main,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 1.5,
                          fontSize: "0.85rem",
                        },
                      })}
                    >
                      <TableCell colSpan={8} align="right">
                        <Typography variant="body1" fontWeight={800}>
                          Total
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.08,
                          )}`,
                        })}
                      />
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={700}>
                          {formatKgs(totals.totalHarvestedKgs)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={700}>
                          {formatKgs(totals.totalToStockKgs)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color="primary"
                        >
                          {formatKgs(totals.totalDirectTruckKgs)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile cards */}
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <Stack spacing={2}>
                <Card
                  sx={(theme) => ({
                    borderRadius: 2,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.2,
                    )}`,
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.05,
                    )} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                  })}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      fontWeight={700}
                      mb={1}
                    >
                      TOTAL
                    </Typography>
                    <Stack spacing={1.2}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={1.5}
                      >
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Cosechados
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            align="left"
                          >
                            {formatKgs(totals.totalHarvestedKgs)} kg
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            flexWrap="wrap"
                          >
                            Ingresados a Stock
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            color="primary"
                            align="left"
                          >
                            {formatKgs(totals.totalToStockKgs)} kg
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Egresados en Camión
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            color="primary"
                            align="left"
                          >
                            {formatKgs(totals.totalDirectTruckKgs)} kg
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {sortedHarvests.map((harvest) => {
                  const lotsIds = ensureArray(harvest.lotsIds);
                  const lotsLabels = ensureArray(harvest.lotsLabels);
                  return (
                    <Card
                      key={harvest.id}
                      onClick={() => {
                        void openEditDialog(harvest);
                      }}
                      sx={(theme) => ({
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08,
                        )}`,
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: `0 8px 24px ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                          borderColor: theme.palette.primary.main,
                        },
                      })}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            color="primary"
                          >
                            {harvest.harvestId || `#${harvest.id}`}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <CropChip crop={harvest.crop} size="small" />

                            {lotsIds.length ? (
                              <Stack
                                spacing={0.5}
                                flexWrap="wrap"
                                direction="row"
                              >
                                {lotsIds.map((lid, i) => (
                                  <Chip
                                    key={lid}
                                    size="small"
                                    variant="outlined"
                                    label={`${lotsLabels[i] ?? `Lote ${lid}`}`}
                                    sx={{
                                      fontSize: "body2",
                                      fontWeight: 600,
                                      mb: 0.5,
                                    }}
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </Stack>
                          <Box
                            sx={(theme) => ({
                              height: "1px",
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />
                          <Stack spacing={0.5}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={700}
                            >
                              Ciclo
                            </Typography>
                            <Typography
                              component={Link}
                              href={`/ciclos/${harvest.cycleId}`}
                              onClick={(event) => event.stopPropagation()}
                              sx={(theme) => ({
                                fontSize: "0.9rem",
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                              })}
                            >
                              {harvest.cycleLabel || `Ciclo ${harvest.cycleId}`}
                            </Typography>
                          </Stack>

                          <Box
                            sx={(theme) => ({
                              height: 1,
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />
                          <Stack direction="row" justifyContent="space-between">
                            <Stack spacing={0.5}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Cosechados
                              </Typography>
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                align="left"
                              >
                                {formatKgs(Number(harvest.harvestedKgs) || 0)}{" "}
                                kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.5}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Ingresados a Stock
                              </Typography>
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                color="primary"
                                align="left"
                              >
                                {formatKgs(Number(harvest.stockKgs) || 0)} kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.5} alignItems="flex-end">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Egresados en Camión
                              </Typography>
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                color="primary"
                                align="left"
                              >
                                {formatKgs(Number(harvest.directTruckKgs) || 0)}{" "}
                                kg
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </DashboardCard>
      </Stack>
      <SimpleEntityDialogForm
        key={`${dialogMode}-${activeHarvest?.id ?? "new"}-${dialogValuesPatch?.key ?? 0}`}
        open={dialogOpen}
        title={dialogTitle}
        onClose={handleDialogClose}
        onSubmit={dialogSubmitHandler}
        fields={harvestFormFields}
        sections={harvestFormSections}
        initialValues={dialogInitialValues}
        onFieldChange={handleDialogFieldChange}
        externalValues={dialogValuesPatch?.data ?? null}
        externalValuesKey={dialogValuesPatch?.key ?? null}
        extraActions={
          dialogMode === "edit" ? (
            <Button
              color="error"
              variant="outlined"
              onClick={openDeleteConfirm}
              startIcon={<DeleteOutlineIcon />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2.5,
              }}
            >
              Borrar cosecha
            </Button>
          ) : undefined
        }
      />
      <StockDialog
        open={stockDialogOpen}
        mode="create"
        activeStock={null}
        initialValues={stockDialogInitialValues}
        unitTypeOptions={stockUnitTypeOptions}
        statusOptions={stockStatusOptions}
        onClose={handleStockDialogClose}
        onSuccess={handleStockDialogSuccess}
      />
      <TruckTripDialog
        open={tripDialogOpen}
        mode="create"
        activeTrip={null}
        initialValues={tripDialogInitialValues ?? undefined}
        onClose={handleTripDialogClose}
        onSuccess={handleTripDialogSuccess}
      />
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        disableEscapeKeyDown={deleteLoading}
      >
        <DialogTitle>Borrar cosecha</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            ¿Seguro que querés borrar esta cosecha? Esta acción es irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteConfirm}
            disabled={deleteLoading}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirmed}
            disabled={deleteLoading}
            startIcon={
              deleteLoading ? (
                <CircularProgress color="inherit" size={18} />
              ) : null
            }
            sx={{ textTransform: "none" }}
          >
            {deleteLoading ? "Borrando..." : "Borrar"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CosechasPageClient;
