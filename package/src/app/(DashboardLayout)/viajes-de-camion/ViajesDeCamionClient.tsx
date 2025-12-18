"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Stack,
  Typography,
  FormControl,
  Paper,
  alpha,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Card,
  CardContent,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import StatusChip, {
  StatusChipOption,
} from "@/app/(DashboardLayout)/components/shared/StatusChip";
import type { TruckTripDto, TripOriginType } from "@/lib/baserow/truckTrips";
import SimpleEntityDialogForm, {
  type DialogFieldOption,
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import {
  normalizeTruckTripDtoToBaserowPayload,
  normalizeTruckTripFormToBaserowPayload,
} from "@/lib/truckTrips/formPayload";
import { splitIsoToDateAndTimeLocal } from "@/lib/forms/datetime";

type ViajesDeCamionClientProps = {
  initialTrips: TruckTripDto[];
};

/* --------- Helpers puros --------- */

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

const getOriginLabel = (originType: TripOriginType): string => {
  switch (originType) {
    case "harvest":
      return "Cosecha";
    case "stock":
      return "Stock";
    default:
      return "Sin origen";
  }
};

const getOriginChipColor = (
  originType: TripOriginType,
): "default" | "warning.dark" | "success.dark" => {
  switch (originType) {
    case "harvest":
      return "success.dark";
    case "stock":
      return "warning.dark";
    default:
      return "default";
  }
};

const TRIP_STATUS_OPTIONS: StatusChipOption[] = [
  { value: "Entregado", color: "success" },
  { value: "En viaje", color: "warning" },
  { value: "Pendiente", color: "info" },
];

const getDestinationLabel = (trip: TruckTripDto): string => {
  if (trip.provider) return trip.provider;
  if (trip.destinationDetail) return trip.destinationDetail;
  if (trip.destinationType) return trip.destinationType;
  return "—";
};

type Option = {
  id: number;
  label: string;
};

type TruckTripFormOptions = {
  trucks: Option[];
  statuses: Option[];
  destinationTypes: Option[];
  providers: Option[];
  fields: Option[];
};

type OriginApiOption = {
  id: number;
  label: string;
  meta?: {
    cycleLabel: string | null;
    cycleRowId: number | null;
  };
};

type TruckTripFormValues = {
  Camión: number | "";
  CTG: string;
  Estado: number | "";
  "Fecha de salida - Fecha": string;
  "Fecha de salida - Hora": string;
  "Campo origen": number | "";
  "Tipo origen": "harvest" | "stock";
  Origen: number | "";
  "Ciclo de siembra": string;
  "Kg carga origen": string;
  "Tipo destino": number | "";
  Proveedor: number | "";
  "Detalle Destino": string;
  "Kg carga destino": string;
  Notas: string;
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
};

type SelectedFieldState = { id?: number; label?: string } | null;

const pad = (value: number): string => String(value).padStart(2, "0");

const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const normalizeLabel = (value?: string | null): string =>
  value?.trim().toLowerCase() ?? "";

const ORIGIN_TYPE_SELECT_OPTIONS: Array<{
  label: string;
  value: "harvest" | "stock";
}> = [
  { label: "Cosecha", value: "harvest" },
  { label: "Stock", value: "stock" },
];

const getDefaultTruckTripFormValues = (
  options?: TruckTripFormOptions | null,
): TruckTripFormValues => {
  const statuses = options?.statuses ?? [];
  const destinationTypes = options?.destinationTypes ?? [];

  const deliveredStatus =
    statuses.find((option) => normalizeLabel(option.label) === "entregado") ??
    statuses[0];

  return {
    Camión: "",
    CTG: "",
    Estado: deliveredStatus?.id ?? "",
    "Fecha de salida - Fecha": getTodayDateString(),
    "Fecha de salida - Hora": getCurrentTimeString(),
    "Campo origen": "",
    "Tipo origen": "harvest",
    Origen: "",
    "Ciclo de siembra": "",
    "Kg carga origen": "",
    "Tipo destino": destinationTypes[0]?.id ?? "",
    Proveedor: "",
    "Detalle Destino": "",
    "Kg carga destino": "",
    Notas: "",
  };
};

const findFieldOptionForTrip = (
  trip: TruckTripDto,
  fieldOptions?: Option[],
): Option | null => {
  if (!fieldOptions?.length) return null;
  const normalizedOptions = new Map(
    fieldOptions.map((option) => [normalizeLabel(option.label), option]),
  );
  const candidates = [
    trip.originField,
    trip.originFieldFromHarvest,
    trip.originFieldFromStock,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeLabel(candidate);
    if (normalized && normalizedOptions.has(normalized)) {
      return normalizedOptions.get(normalized) ?? null;
    }
  }
  return null;
};

const buildTruckTripInitialValues = (params: {
  trip: TruckTripDto;
  options?: TruckTripFormOptions | null;
}): TruckTripFormValues => {
  const { trip, options } = params;
  const trucks = options?.trucks ?? [];
  const statuses = options?.statuses ?? [];
  const destinationTypes = options?.destinationTypes ?? [];
  const providers = options?.providers ?? [];
  const fields = options?.fields ?? [];

  const { date, time } = splitIsoToDateAndTimeLocal(trip.date);

  const findOptionId = (
    collection: Option[],
    label: string | null | string | undefined,
  ) => {
    if (!label) return "";
    const normalized = normalizeLabel(label);
    const match = collection.find(
      (option) => normalizeLabel(option.label) === normalized,
    );
    return match?.id ?? "";
  };

  const truckId = trip.truckId ?? findOptionId(trucks, trip.truckPlate);
  const statusId =
    trip.statusId ?? findOptionId(statuses, trip.status || "Entregado");
  const destinationTypeId =
    trip.destinationTypeId ??
    findOptionId(destinationTypes, trip.destinationType);
  const providerId =
    trip.providerIds?.[0] ??
    findOptionId(providers, trip.provider || trip.destinationDetail);

  const fieldOption = findFieldOptionForTrip(trip, fields);
  const originTypeValue = trip.originType === "stock" ? "stock" : "harvest";
  const originId =
    originTypeValue === "stock"
      ? (trip.stockOriginIds[0] ?? "")
      : (trip.harvestOriginIds[0] ?? "");

  return {
    Camión: truckId || "",
    CTG: trip.ctg ? String(trip.ctg) : "",
    Estado: statusId || "",
    "Fecha de salida - Fecha": date || getTodayDateString(),
    "Fecha de salida - Hora": time || getCurrentTimeString(),
    "Campo origen": fieldOption?.id ?? "",
    "Tipo origen": originTypeValue,
    Origen: originId || "",
    "Ciclo de siembra": trip.cycleLabel || "",
    "Kg carga origen": trip.totalKgsOrigin ? String(trip.totalKgsOrigin) : "",
    "Tipo destino": destinationTypeId || "",
    Proveedor: providerId || "",
    "Detalle Destino": trip.destinationDetail || "",
    "Kg carga destino": trip.totalKgsDestination
      ? String(trip.totalKgsDestination)
      : "",
    Notas: trip.notes || "",
  };
};

const normalizeArrayForComparison = (arr: unknown[]): unknown[] => {
  if (!arr.length) return [];

  if (arr.every((value) => typeof value === "number")) {
    return [...arr].sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
  }

  if (arr.every((value) => typeof value === "string")) {
    return [...arr]
      .map((value) => String(value))
      .sort((a, b) => a.localeCompare(b));
  }

  return [...arr];
};

const isEqualValue = (a: unknown, b: unknown): boolean => {
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
): Record<string, any> => {
  const diff: Record<string, any> = {};

  Object.keys(nextPayload).forEach((key) => {
    if (!isEqualValue(prevPayload[key], nextPayload[key])) {
      diff[key] = nextPayload[key];
    }
  });

  return diff;
};

const TRIP_FORM_SECTIONS: SimpleEntityDialogSection[] = [
  {
    title: "Datos del viaje",
    fields: [
      "Camión",
      "CTG",
      "Estado",
      "Fecha de salida - Fecha",
      "Fecha de salida - Hora",
    ],
  },
  {
    title: "Origen",
    fields: [
      "Campo origen",
      "Tipo origen",
      "Origen",
      "Ciclo de siembra",
      "Kg carga origen",
    ],
  },
  {
    title: "Destino y notas",
    fields: [
      "Tipo destino",
      "Proveedor",
      "Detalle Destino",
      "Kg carga destino",
      "Notas",
    ],
  },
];

/* --------- Componente principal --------- */

const ViajesDeCamionClient = ({ initialTrips }: ViajesDeCamionClientProps) => {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [activeTrip, setActiveTrip] = React.useState<TruckTripDto | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<TruckTripFormValues>(() => getDefaultTruckTripFormValues());
  const [snackbarState, setSnackbarState] = React.useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const showToast = React.useCallback(
    (message: string, severity: SnackbarState["severity"]) => {
      setSnackbarState({ open: true, message, severity });
    },
    [],
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [formOptions, setFormOptions] =
    React.useState<TruckTripFormOptions | null>(null);
  const [formOptionsLoading, setFormOptionsLoading] = React.useState(false);

  const [selectedField, setSelectedField] =
    React.useState<SelectedFieldState>(null);
  const [selectedOriginType, setSelectedOriginType] = React.useState<
    "harvest" | "stock"
  >("harvest");
  const [originSelectOptions, setOriginSelectOptions] = React.useState<
    DialogFieldOption[]
  >([]);
  const originOptionsCache = React.useRef<Record<string, DialogFieldOption[]>>(
    {},
  );
  const [originOptionsLoading, setOriginOptionsLoading] = React.useState(false);
  const [originOptionsError, setOriginOptionsError] = React.useState<
    string | null
  >(null);

  const sortedTrips = React.useMemo(() => {
    const clone = [...initialTrips];
    const toTime = (value: string | null) => {
      if (!value) return Number.NEGATIVE_INFINITY;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
    };
    clone.sort((a, b) => toTime(b.date) - toTime(a.date));
    return clone;
  }, [initialTrips]);

  // Filtros
  const [periodFilter, setPeriodFilter] = React.useState<string>("all");
  const [fieldFilter, setFieldFilter] = React.useState<string>("all");
  const [cycleFilter, setCycleFilter] = React.useState<string>("all");
  const [destinationFilter, setDestinationFilter] =
    React.useState<string>("all");
  const [originFilter, setOriginFilter] = React.useState<
    TripOriginType | "all"
  >("all");

  // Valores únicos para selects
  const uniqueFields = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          sortedTrips
            .map((t: TruckTripDto) => {
              return (
                t.originField ||
                t.originFieldFromStock ||
                t.originFieldFromHarvest
              );
            })
            .filter((v): v is string => Boolean(v))
        ),
      ).sort(),
    [sortedTrips]
  );

  const uniqueCycles = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          sortedTrips
            .map((t: TruckTripDto) => t.cycleLabel)
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort(),
    [sortedTrips],
  );

  const periodOptions = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          sortedTrips
            .map((trip: TruckTripDto) => trip.period)
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort(),
    [sortedTrips],
  );

  // Destino: todas las opciones que se muestran en la tabla (getDestinationLabel)
  const uniqueDestinations = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          sortedTrips
            .map((t: TruckTripDto) => getDestinationLabel(t))
            .filter((v) => v !== "—"),
        ),
      ).sort(),
    [sortedTrips],
  );

  const fetchFormOptions = React.useCallback(async () => {
    try {
      setFormOptionsLoading(true);
      const response = await fetch("/api/truck-trips/options");
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          errorBody || "No se pudieron cargar las opciones del formulario",
        );
      }
      const data = (await response.json()) as TruckTripFormOptions;
      setFormOptions(data);
      return data;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las opciones del formulario";
      showToast(message, "error");
      throw error;
    } finally {
      setFormOptionsLoading(false);
    }
  }, [showToast]);

  const ensureFormOptions = React.useCallback(async () => {
    if (formOptions) return formOptions;
    return fetchFormOptions();
  }, [fetchFormOptions, formOptions]);

  React.useEffect(() => {
    if (!formOptions && !formOptionsLoading) {
      fetchFormOptions().catch(() => undefined);
    }
  }, [fetchFormOptions, formOptions, formOptionsLoading]);

  const loadOriginOptions = React.useCallback(
    async (params: {
      campoId?: number;
      campoName?: string;
      originType: "harvest" | "stock";
      originId?: number;
    }) => {
      const { campoId, campoName, originType, originId } = params;
      if (!campoId && !campoName) {
        setOriginSelectOptions([]);
        return null;
      }

      const cacheKey = `${originType}-${campoId ?? campoName ?? "unknown"}`;
      const shouldBypassCache = Boolean(originId);
      if (!shouldBypassCache && originOptionsCache.current[cacheKey]) {
        setOriginSelectOptions(originOptionsCache.current[cacheKey]);
        return originOptionsCache.current[cacheKey];
      }

      setOriginOptionsLoading(true);
      setOriginOptionsError(null);
      try {
        const searchParams = new URLSearchParams();
        if (campoId) searchParams.set("campoId", String(campoId));
        else if (campoName) searchParams.set("campoName", campoName);
        searchParams.set("originType", originType);
        if (originId) searchParams.set("originId", String(originId));

        const response = await fetch(
          `/api/truck-trips/options?${searchParams.toString()}`,
        );
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            errorBody || "No se pudieron cargar los orígenes disponibles",
          );
        }

        const data = await response.json();
        const originOptions: OriginApiOption[] = data.origins ?? [];
        const mapped: DialogFieldOption[] = originOptions.map(
          (origin: OriginApiOption) => ({
            label: origin.label,
            value: origin.id,
            meta: origin.meta ?? {},
          }),
        );

        const selectedOrigin = data.selectedOrigin as
          | { id: number; cycleLabel: string | null; cycleRowId: number | null }
          | undefined;

        if (
          selectedOrigin &&
          !mapped.some((option) => option.value === selectedOrigin.id)
        ) {
          const selectedLabel =
            originOptions.find((option) => option.id === selectedOrigin.id)
              ?.label ?? `Origen #${selectedOrigin.id}`;
          mapped.push({
            label: selectedLabel,
            value: selectedOrigin.id,
            meta: {
              cycleLabel: selectedOrigin.cycleLabel,
              cycleRowId: selectedOrigin.cycleRowId,
            },
          });
        }

        originOptionsCache.current[cacheKey] = mapped;
        setOriginSelectOptions(mapped);
        return mapped;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los orígenes disponibles";
        setOriginOptionsError(message);
        setOriginSelectOptions([]);
        return null;
      } finally {
        setOriginOptionsLoading(false);
      }
    },
    [],
  );

  const handleDialogFieldChange = React.useCallback(
    (key: string, value: any) => {
      if (key === "Campo origen") {
        if (!value) {
          setSelectedField(null);
          setOriginSelectOptions([]);
          setOriginOptionsError(null);
          return;
        }

        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          setSelectedField(null);
          setOriginSelectOptions([]);
          setOriginOptionsError(null);
          return;
        }

        const matchedField =
          formOptions?.fields.find((field) => field.id === numericValue) ??
          null;
        setSelectedField(matchedField);
        setOriginOptionsError(null);
        void loadOriginOptions({
          campoId: matchedField?.id ?? numericValue,
          campoName: matchedField?.label,
          originType: selectedOriginType,
        });
      } else if (key === "Tipo origen") {
        const normalizedType = value === "stock" ? "stock" : "harvest";
        setSelectedOriginType(normalizedType);
        setOriginOptionsError(null);
        if (selectedField?.id || selectedField?.label) {
          void loadOriginOptions({
            campoId: selectedField?.id,
            campoName: selectedField?.label,
            originType: normalizedType,
          });
        }
      }
    },
    [formOptions?.fields, loadOriginOptions, selectedField, selectedOriginType],
  );

  const truckSelectOptions = React.useMemo<DialogFieldOption[]>(
    () =>
      formOptions?.trucks.map((truck) => ({
        label: truck.label,
        value: truck.id,
      })) ?? [],
    [formOptions?.trucks],
  );

  const statusSelectOptions = React.useMemo<DialogFieldOption[]>(
    () =>
      formOptions?.statuses.map((status) => ({
        label: status.label,
        value: status.id,
      })) ?? [],
    [formOptions?.statuses],
  );

  const destinationSelectOptions = React.useMemo<DialogFieldOption[]>(
    () =>
      formOptions?.destinationTypes.map((destination) => ({
        label: destination.label,
        value: destination.id,
      })) ?? [],
    [formOptions?.destinationTypes],
  );

  const providerSelectOptions = React.useMemo<DialogFieldOption[]>(() => {
    const base =
      formOptions?.providers.map((provider) => ({
        label: provider.label,
        value: provider.id,
      })) ?? [];
    return [{ label: "Sin proveedor", value: "" }, ...base];
  }, [formOptions?.providers]);

  const fieldSelectOptions = React.useMemo<DialogFieldOption[]>(
    () =>
      formOptions?.fields.map((field) => ({
        label: field.label,
        value: field.id,
      })) ?? [],
    [formOptions?.fields],
  );

  const originHelperText = React.useMemo(() => {
    if (!selectedField) {
      return "Seleccionar un campo para ver los orígenes disponibles";
    }
    return originOptionsError ?? undefined;
  }, [originOptionsError, selectedField]);

  const tripFormFields = React.useMemo<SimpleEntityDialogFieldConfig[]>(
    () => [
      {
        key: "Camión",
        label: "Camión",
        type: "select",
        required: true,
        options: truckSelectOptions,
        loading: formOptionsLoading && !formOptions,
      },
      {
        key: "CTG",
        label: "CTG",
        type: "number",
        step: 1,
      },
      {
        key: "Estado",
        label: "Estado",
        type: "select",
        required: true,
        options: statusSelectOptions,
        loading: formOptionsLoading && !formOptions,
      },
      {
        key: "Fecha de salida - Fecha",
        label: "Fecha de salida",
        type: "date",
        required: true,
      },
      {
        key: "Fecha de salida - Hora",
        label: "Hora de salida",
        type: "time",
        required: true,
      },
      {
        key: "Campo origen",
        label: "Campo origen",
        type: "select",
        required: true,
        options: fieldSelectOptions,
        loading: formOptionsLoading && !formOptions,
        onValueChange: () => ({
          Origen: "",
          "Ciclo de siembra": "",
        }),
      },
      {
        key: "Tipo origen",
        label: "Tipo de origen",
        type: "select",
        required: true,
        options: ORIGIN_TYPE_SELECT_OPTIONS,
        onValueChange: () => ({
          Origen: "",
          "Ciclo de siembra": "",
        }),
      },
      {
        key: "Origen",
        label: "Origen",
        type: "select",
        required: true,
        options: originSelectOptions,
        loading: originOptionsLoading,
        disabled: !selectedField,
        helperText: originHelperText,
        onValueChange: (value) => {
          const option = originSelectOptions.find(
            (candidate) => candidate.value === value,
          );
          return {
            "Ciclo de siembra": option?.meta?.cycleLabel ?? "",
          };
        },
      },
      {
        key: "Ciclo de siembra",
        label: "Ciclo de siembra",
        type: "readonly",
        helperText: "Se completa automáticamente al seleccionar un origen",
      },
      {
        key: "Kg carga origen",
        label: "Kg carga origen",
        type: "number",
        required: true,
        step: 0.01,
      },
      {
        key: "Tipo destino",
        label: "Tipo de destino",
        type: "select",
        required: true,
        options: destinationSelectOptions,
        loading: formOptionsLoading && !formOptions,
      },
      {
        key: "Proveedor",
        label: "Proveedor",
        type: "select",
        options: providerSelectOptions,
        loading: formOptionsLoading && !formOptions,
      },
      {
        key: "Detalle Destino",
        label: "Detalle del destino",
        type: "text",
        placeholder: "Ej: Puerto Rosario, silo, etc.",
      },
      {
        key: "Kg carga destino",
        label: "Kg carga destino",
        type: "number",
        step: 0.01,
      },
      {
        key: "Notas",
        label: "Notas",
        type: "textarea",
        placeholder: "Agregá comentarios adicionales…",
      },
    ],
    [
      destinationSelectOptions,
      fieldSelectOptions,
      formOptions,
      formOptionsLoading,
      originHelperText,
      originOptionsLoading,
      originSelectOptions,
      providerSelectOptions,
      selectedField,
      statusSelectOptions,
      truckSelectOptions,
    ],
  );

  const tripFormSections = React.useMemo(() => TRIP_FORM_SECTIONS, []);

  const handleOpenCreateDialog = React.useCallback(async () => {
    setDialogMode("create");
    setActiveTrip(null);
    setDeleteConfirmOpen(false);
    setDeleteLoading(false);
    setSelectedField(null);
    setSelectedOriginType("harvest");
    setOriginSelectOptions([]);
    setOriginOptionsError(null);

    try {
      const options = await ensureFormOptions();
      setDialogInitialValues(getDefaultTruckTripFormValues(options));
      setDialogOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las opciones para el formulario";
      showToast(message, "error");
    }
  }, [ensureFormOptions, showToast]);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode("create");
    setActiveTrip(null);
    setSelectedField(null);
    setSelectedOriginType("harvest");
    setOriginSelectOptions([]);
    setOriginOptionsError(null);
    setDialogInitialValues(getDefaultTruckTripFormValues(formOptions));
  }, [formOptions]);

  const openEditDialog = React.useCallback(
    async (trip: TruckTripDto) => {
      setDialogMode("edit");
      setActiveTrip(trip);
      setDeleteConfirmOpen(false);
      setDeleteLoading(false);
      setOriginOptionsError(null);

      try {
        const options = await ensureFormOptions();
        const initialValues = buildTruckTripInitialValues({
          trip,
          options,
        });
        const fieldOption = findFieldOptionForTrip(trip, options?.fields);
        const fieldNameFallback =
          fieldOption?.label ||
          trip.originField ||
          trip.originFieldFromHarvest ||
          trip.originFieldFromStock ||
          undefined;
        setSelectedField(
          fieldOption ??
            (fieldNameFallback ? { label: fieldNameFallback } : null),
        );
        const originTypeValue =
          trip.originType === "stock" ? "stock" : "harvest";
        setSelectedOriginType(originTypeValue);

        if (fieldOption || fieldNameFallback) {
          await loadOriginOptions({
            campoId: fieldOption?.id,
            campoName: fieldNameFallback,
            originType: originTypeValue,
            originId:
              originTypeValue === "stock"
                ? trip.stockOriginIds[0]
                : trip.harvestOriginIds[0],
          });
        } else {
          setOriginSelectOptions([]);
        }

        setDialogInitialValues(initialValues);
        setDialogOpen(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo abrir el formulario de edición";
        showToast(message, "error");
      }
    },
    [ensureFormOptions, loadOriginOptions, showToast],
  );

  const handleCreateSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      try {
        const payload = normalizeTruckTripFormToBaserowPayload(formValues);
        const response = await fetch("/api/truck-trips", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payload }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let message = "No se pudo registrar el viaje";
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

        showToast("Viaje registrado correctamente", "success");
        handleDialogClose();
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo registrar el viaje";
        showToast(message, "error");
        throw error;
      }
    },
    [handleDialogClose, router, showToast],
  );

  const handleEditSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      if (!activeTrip) {
        showToast("No se encontró el viaje a editar", "error");
        return;
      }

      const nextPayload = normalizeTruckTripFormToBaserowPayload(formValues, {
        includeEmptyOptional: true,
      });
      const prevPayload = normalizeTruckTripDtoToBaserowPayload(activeTrip);
      const diffPayload = computeDiffPayload(prevPayload, nextPayload);

      if (!Object.keys(diffPayload).length) {
        showToast("No hay cambios para guardar", "info");
        return;
      }

      const response = await fetch(`/api/truck-trips/${activeTrip.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: diffPayload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo actualizar el viaje";
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

      showToast("Viaje actualizado correctamente", "success");
      handleDialogClose();
      router.refresh();
    },
    [activeTrip, handleDialogClose, router, showToast],
  );

  const dialogSubmitHandler =
    dialogMode === "create" ? handleCreateSubmit : handleEditSubmit;
  const editTripIdentifier =
    activeTrip?.tripId || (activeTrip ? `#${activeTrip.id}` : null);
  const dialogTitle =
    dialogMode === "create"
      ? "Registrar nuevo viaje de camión"
      : editTripIdentifier
        ? `Editar viaje ${editTripIdentifier}`
        : "Editar viaje de camión";

  const openDeleteConfirm = React.useCallback(() => {
    if (!activeTrip) return;
    setDeleteConfirmOpen(true);
  }, [activeTrip]);

  const handleCloseDeleteConfirm = React.useCallback(() => {
    if (deleteLoading) return;
    setDeleteConfirmOpen(false);
  }, [deleteLoading]);

  const handleDeleteConfirmed = React.useCallback(async () => {
    if (!activeTrip) {
      showToast("No se encontró el viaje a borrar", "error");
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/truck-trips/${activeTrip.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo borrar el viaje";
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

      showToast("Viaje borrado correctamente", "success");
      setDeleteConfirmOpen(false);
      handleDialogClose();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al borrar el viaje";
      showToast(message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [activeTrip, handleDialogClose, router, showToast]);

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  // Trips filtrados
  const filteredTrips = React.useMemo<TruckTripDto[]>(() => {
    return sortedTrips.filter((trip: TruckTripDto) => {
      // Período
      if (periodFilter !== "all" && trip.period !== periodFilter) return false;

      // Campo
      if (fieldFilter !== "all") {
        const fieldCandidate =
          trip.originField ||
          trip.originFieldFromStock ||
          trip.originFieldFromHarvest;
        if (fieldCandidate !== fieldFilter) return false;
      }

      // Ciclo
      if (cycleFilter !== "all") {
        if (trip.cycleLabel !== cycleFilter) return false;
      }

      // Destino
      if (destinationFilter !== "all") {
        const tableDestination = getDestinationLabel(trip);
        if (tableDestination !== destinationFilter) return false;
      }

      // Origen
      if (originFilter !== "all") {
        if (trip.originType !== originFilter) return false;
      }

      return true;
    });
  }, [
    sortedTrips,
    periodFilter,
    fieldFilter,
    cycleFilter,
    destinationFilter,
    originFilter,
  ]);

  const filteredTotals = React.useMemo(
    () =>
      filteredTrips.reduce(
        (acc, trip) => {
          const originKgs = trip.totalKgsOrigin ?? 0;
          const destinationKgs = trip.totalKgsDestination ?? 0;

          acc.totalKgsOrigin += originKgs;
          acc.totalKgsDestination += destinationKgs;
          acc.totalDifference += destinationKgs - originKgs;

          return acc;
        },
        { totalKgsOrigin: 0, totalKgsDestination: 0, totalDifference: 0 },
      ),
    [filteredTrips],
  );

  return (
    <PageContainer
      title="Viajes de camión"
      description="Logística de salida de la cosecha"
    >
      <Stack spacing={3}>
        {/* Encabezado */}
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
            Viajes de camión
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: "800px" }}
          >
            Vista consolidada de la logística de salida: camiones, kilos y
            destinos.
          </Typography>
        </Box>

        {/* Filtros */}
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
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {periodOptions.map((period, index) => (
                      <MenuItem key={`${period}-${index}`} value={period}>
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
                    onChange={(e) => setFieldFilter(e.target.value)}
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
                    label="Ciclo"
                    select
                    value={cycleFilter}
                    onChange={(e) => setCycleFilter(e.target.value)}
                    fullWidth
                    sx={{ bgcolor: "background.paper" }}
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueCycles.map((ciclo) => (
                      <MenuItem key={ciclo} value={ciclo}>
                        {ciclo}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Origen"
                    select
                    value={originFilter}
                    sx={{ bgcolor: "background.paper" }}
                    onChange={(e) =>
                      setOriginFilter(e.target.value as TripOriginType | "all")
                    }
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="harvest">Cosecha</MenuItem>
                    <MenuItem value="stock">Stock</MenuItem>
                    <MenuItem value="unknown">Sin origen</MenuItem>
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Destino / Proveedor"
                    select
                    value={destinationFilter}
                    onChange={(e) => setDestinationFilter(e.target.value)}
                    fullWidth
                    sx={{ bgcolor: "background.paper" }}
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueDestinations.map((dest) => (
                      <MenuItem key={dest} value={dest}>
                        {dest}
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
                  {filteredTrips.length} viaje
                  {filteredTrips.length !== 1 ? "s" : ""} registrado
                  {filteredTrips.length !== 1 ? "s" : ""}
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
                  onClick={handleOpenCreateDialog}
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
                >
                  Nuevo Viaje de Camión
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

            {/* Tabla de viajes */}

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
                <Table size="small" sx={{ minWidth: 600 }}>
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
                      <TableCell>ID Viaje</TableCell>
                      <TableCell>Camión</TableCell>
                      <TableCell>Fecha de salida</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell>Ciclo</TableCell>
                      <TableCell>Origen</TableCell>
                      <TableCell>Destino / Proveedor</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell align="right">Kgs Origen</TableCell>
                      <TableCell align="right">Kgs Destino</TableCell>
                      <TableCell align="right">Kgs Diferencia</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTrips.map((trip, index) => {
                      const { date, time } = formatDateTimeParts(trip.date);
                      const originKgs = trip.totalKgsOrigin ?? 0;
                      const destinationKgs = trip.totalKgsDestination ?? 0;
                      const differenceKgs = destinationKgs - originKgs;

                      return (
                        <TableRow
                          key={trip.id}
                          hover
                          onClick={() => {
                            void openEditDialog(trip);
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
                              transform: "scale(1.005)",
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
                          {/* ID */}
                          <TableCell>
                            <Stack spacing={1.5} justifyItems="flex-start">
                              <Typography
                                variant="body1"
                                fontWeight={600}
                                paddingLeft="0.5rem"
                              >
                                {trip.tripId}
                              </Typography>
                              {trip.ctg ? (
                                <Chip
                                  size="small"
                                  label={`CTG ${trip.ctg}`}
                                  sx={(theme) => ({
                                    alignSelf: "flex-start",

                                    fontWeight: 600,
                                    fontSize: theme.typography.caption,
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.05,
                                    ),
                                    color: theme.palette.primary.main,
                                    borderRadius: "999px",
                                  })}
                                />
                              ) : null}
                            </Stack>
                          </TableCell>

                          {/* Camión */}
                          <TableCell>
                            <Stack>
                              <Chip
                                size="small"
                                label={trip.truckPlate}
                                variant="outlined"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.9rem",
                                  textTransform: "capitalize",
                                  color: "text.primary",
                                }}
                              />
                            </Stack>
                          </TableCell>

                          {/* Fecha */}
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {date}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{
                                display: "block",
                                lineHeight: 1.2,
                                mt: 0.5,
                              }}
                            >
                              {time}
                            </Typography>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                            <StatusChip
                              status={trip.status}
                              options={TRIP_STATUS_OPTIONS}
                            />
                          </TableCell>
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08,
                              )}`,
                            })}
                          />
                          {/* Ciclo (link al detalle) */}
                          <TableCell>
                            {trip.cycleLabel ? (
                              <Typography
                                component={Link}
                                href={`/ciclos/${trip.cycleRowId}`}
                                onClick={(event) => event.stopPropagation()}
                                sx={(theme) => ({
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  textDecoration: "none",
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                })}
                              >
                                {trip.cycleLabel}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>

                          {/* Origen */}
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getOriginLabel(trip.originType)}
                                sx={(theme) => ({
                                  fontWeight: 600,
                                  fontSize: "body1",
                                  color: `${getOriginChipColor(
                                    trip.originType,
                                  )}`,
                                  border: `2px solid ${alpha(
                                    theme.palette.primary.main,
                                    0.08,
                                  )}`,
                                })}
                              />
                            </Stack>
                          </TableCell>

                          {/* Destino */}
                          <TableCell>
                            <Typography variant="body1">
                              {getDestinationLabel(trip)}
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
                          {/* Kgs */}
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600}>
                              {originKgs.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {destinationKgs.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color={
                                differenceKgs >= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                            >
                              {differenceKgs.toLocaleString("es-ES")}
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
                        Total
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
                        <Typography variant="body1" fontWeight={600}>
                          {filteredTotals.totalKgsOrigin.toLocaleString(
                            "es-ES",
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color="primary"
                        >
                          {filteredTotals.totalKgsDestination.toLocaleString(
                            "es-ES",
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color={
                            filteredTotals.totalDifference >= 0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {filteredTotals.totalDifference.toLocaleString(
                            "es-ES",
                          )}
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
                    <Stack
                      spacing={1.2}
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Stack spacing={0.2}>
                        <Typography variant="caption" color="text.secondary">
                          Kgs Origen
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {filteredTotals.totalKgsOrigin.toLocaleString(
                            "es-ES",
                          )}{" "}
                          kg
                        </Typography>
                      </Stack>
                      <Stack spacing={0.2}>
                        <Typography variant="caption" color="text.secondary">
                          Kgs Destino
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color="primary"
                        >
                          {filteredTotals.totalKgsDestination.toLocaleString(
                            "es-ES",
                          )}{" "}
                          kg
                        </Typography>
                      </Stack>
                      <Stack spacing={0.2}>
                        <Typography variant="caption" color="text.secondary">
                          Kgs Diferencia
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color={
                            filteredTotals.totalDifference >= 0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {filteredTotals.totalDifference.toLocaleString(
                            "es-ES",
                          )}{" "}
                          kg
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {filteredTrips.map((trip) => {
                  const { date, time } = formatDateTimeParts(trip.date);
                  const originKgs = trip.totalKgsOrigin ?? 0;
                  const destinationKgs = trip.totalKgsDestination ?? 0;
                  const differenceKgs = destinationKgs - originKgs;
                  return (
                    <Card
                      key={trip.id}
                      onClick={() => {
                        void openEditDialog(trip);
                      }}
                      sx={(theme) => ({
                        cursor: "pointer",
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08,
                        )}`,
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
                          {/* Header */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={2}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              color="primary"
                            >
                              {trip.tripId}
                            </Typography>

                            <StatusChip
                              status={trip.status}
                              options={TRIP_STATUS_OPTIONS}
                            />
                          </Stack>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            {trip.ctg ? (
                              <Chip
                                size="small"
                                label={`CTG ${trip.ctg}`}
                                sx={(theme) => ({
                                  alignSelf: "flex-start",
                                  fontWeight: 600,
                                  fontSize: theme.typography.subtitle2,
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.05,
                                  ),
                                  color: theme.palette.primary.main,
                                  borderRadius: "999px",
                                })}
                              />
                            ) : null}
                            <Typography variant="body2" fontWeight={700}>
                              {date} - {time}
                            </Typography>
                          </Stack>

                          <Box
                            sx={(theme) => ({
                              height: "1px",
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />

                          {/* Origen y destino */}
                          <Stack direction="row" spacing={4}>
                            <Stack spacing={1.5} alignItems="center">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Origen
                              </Typography>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getOriginLabel(trip.originType)}
                                sx={(theme) => ({
                                  fontWeight: 600,
                                  fontSize: "0.7rem",
                                  color: `${getOriginChipColor(
                                    trip.originType,
                                  )}`,
                                  border: `2px solid ${alpha(
                                    theme.palette.primary.main,
                                    0.08,
                                  )}`,
                                })}
                              />
                            </Stack>
                            <Stack spacing={1.5} alignItems="start">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Destino / Proveedor
                              </Typography>
                              <Typography variant="body2" mt={0.5}>
                                {getDestinationLabel(trip)}
                              </Typography>
                            </Stack>
                          </Stack>

                          {/* Kilos */}
                          <Stack
                            spacing={1.2}
                            direction="row"
                            justifyContent="space-between"
                          >
                            <Stack spacing={0.3}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs Origen
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {originKgs.toLocaleString("es-ES")} kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.3}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs Destino
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color="primary"
                              >
                                {destinationKgs.toLocaleString("es-ES")} kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.3}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Diferencia
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={
                                  differenceKgs >= 0
                                    ? "success.main"
                                    : "error.main"
                                }
                              >
                                {differenceKgs.toLocaleString("es-ES")} kg
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
        <SimpleEntityDialogForm
          open={dialogOpen}
          title={dialogTitle}
          onClose={handleDialogClose}
          onSubmit={dialogSubmitHandler}
          fields={tripFormFields}
          sections={tripFormSections}
          initialValues={dialogInitialValues}
          onFieldChange={handleDialogFieldChange}
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
                Borrar viaje
              </Button>
            ) : undefined
          }
        />
        <Dialog
          open={deleteConfirmOpen}
          onClose={handleCloseDeleteConfirm}
          disableEscapeKeyDown={deleteLoading}
        >
          <DialogTitle>Borrar viaje</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              ¿Seguro que querés borrar este viaje? Esta acción es irreversible.
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
      </Stack>
    </PageContainer>
  );
};

export default ViajesDeCamionClient;
