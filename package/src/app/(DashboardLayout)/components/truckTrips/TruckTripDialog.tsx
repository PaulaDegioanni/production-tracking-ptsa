"use client";

import * as React from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useRouter } from "next/navigation";

import SimpleEntityDialogForm, {
  type DialogFieldOption,
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import type { TruckTripDto } from "@/lib/baserow/truckTrips";
import {
  normalizeTruckTripDtoToBaserowPayload,
  normalizeTruckTripFormToBaserowPayload,
} from "@/lib/truckTrips/formPayload";
import { splitIsoToDateAndTimeLocal } from "@/lib/forms/datetime";

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

export type TruckTripFormValues = {
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

type SelectedFieldState = { id?: number; label?: string } | null;

type SnackbarState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
};

export type TruckTripDialogMode = "create" | "edit";

export type TruckTripDialogProps = {
  open: boolean;
  mode: TruckTripDialogMode;
  activeTrip: TruckTripDto | null;
  initialValues?: TruckTripFormValues;
  onClose: () => void;
  onSuccess?: (result: { mode: TruckTripDialogMode; tripId?: number }) => void;
};

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

export const TRUCK_TRIP_FORM_SECTIONS: SimpleEntityDialogSection[] = [
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
    title: "Destino",
    fields: [
      "Tipo destino",
      "Proveedor",
      "Detalle Destino",
      "Kg carga destino",
    ],
  },
  {
    title: "Notas",
    fields: ["Notas"],
  },
];

export const getDefaultTruckTripFormValues = (
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

export const buildTruckTripInitialValues = (params: {
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
  const originTypeValue: "harvest" | "stock" =
    trip.originType === "stock" ? "stock" : "harvest";
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

const TruckTripDialog = ({
  open,
  mode,
  activeTrip,
  initialValues,
  onClose,
  onSuccess,
}: TruckTripDialogProps) => {
  const router = useRouter();
  const [snackbarState, setSnackbarState] = React.useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [formOptions, setFormOptions] =
    React.useState<TruckTripFormOptions | null>(null);
  const [formOptionsLoading, setFormOptionsLoading] = React.useState(false);

  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<TruckTripFormValues>(
      initialValues ?? getDefaultTruckTripFormValues(),
    );
  const [initialValuesKey, setInitialValuesKey] = React.useState(0);

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

  const showToast = React.useCallback(
    (message: string, severity: SnackbarState["severity"]) => {
      setSnackbarState({ open: true, message, severity });
    },
    [],
  );

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const resetDialogState = React.useCallback(() => {
    setSelectedField(null);
    setSelectedOriginType("harvest");
    setOriginSelectOptions([]);
    setOriginOptionsError(null);
  }, []);

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

  React.useEffect(() => {
    if (!open) return;
    if (!formOptions && !formOptionsLoading) {
      fetchFormOptions().catch(() => undefined);
    }
  }, [fetchFormOptions, formOptions, formOptionsLoading, open]);

  React.useEffect(() => {
    if (!open) {
      resetDialogState();
      return;
    }
    if (!formOptions) return;

    if (initialValues) {
      setDialogInitialValues(initialValues);
      setInitialValuesKey((prev) => prev + 1);
      const fieldId =
        typeof initialValues["Campo origen"] === "number"
          ? initialValues["Campo origen"]
          : Number(initialValues["Campo origen"] || "");
      const fieldOption =
        formOptions.fields.find((field) => field.id === fieldId) ?? null;
      setSelectedField(fieldOption);
      const originTypeValue = initialValues["Tipo origen"];
      setSelectedOriginType(originTypeValue);
      setOriginOptionsError(null);
      if (fieldOption) {
        void loadOriginOptions({
          campoId: fieldOption.id,
          campoName: fieldOption.label,
          originType: originTypeValue,
          originId: initialValues.Origen
            ? Number(initialValues.Origen)
            : undefined,
        });
      } else {
        setOriginSelectOptions([]);
      }
      return;
    }

    if (mode === "edit" && activeTrip) {
      const values = buildTruckTripInitialValues({
        trip: activeTrip,
        options: formOptions,
      });
      setDialogInitialValues(values);
      setInitialValuesKey((prev) => prev + 1);
      const fieldOption = findFieldOptionForTrip(
        activeTrip,
        formOptions.fields,
      );
      const fieldNameFallback =
        fieldOption?.label ||
        activeTrip.originField ||
        activeTrip.originFieldFromHarvest ||
        activeTrip.originFieldFromStock ||
        undefined;
      setSelectedField(
        fieldOption ??
          (fieldNameFallback ? { label: fieldNameFallback } : null),
      );
      const originTypeValue: "harvest" | "stock" =
        activeTrip.originType === "stock" ? "stock" : "harvest";
      setSelectedOriginType(originTypeValue);
      setOriginOptionsError(null);
      if (fieldOption || fieldNameFallback) {
        void loadOriginOptions({
          campoId: fieldOption?.id,
          campoName: fieldNameFallback,
          originType: originTypeValue,
          originId:
            originTypeValue === "stock"
              ? activeTrip.stockOriginIds[0]
              : activeTrip.harvestOriginIds[0],
        });
      } else {
        setOriginSelectOptions([]);
      }
      return;
    }

    const defaults = getDefaultTruckTripFormValues(formOptions);
    setDialogInitialValues(defaults);
    setInitialValuesKey((prev) => prev + 1);
    resetDialogState();
  }, [
    activeTrip,
    formOptions,
    initialValues,
    loadOriginOptions,
    mode,
    open,
    resetDialogState,
  ]);

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
        setSelectedField(matchedField ?? { id: numericValue });
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

  const originHelperText = React.useMemo(() => {
    if (!selectedField) {
      return "Selecciona un campo para ver los orígenes disponibles";
    }
    return originOptionsError ?? undefined;
  }, [originOptionsError, selectedField]);

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

  const handleDialogClose = React.useCallback(() => {
    resetDialogState();
    setDeleteConfirmOpen(false);
    setDeleteLoading(false);
    onClose();
  }, [onClose, resetDialogState]);

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

        const data = (await response.json().catch(() => null)) as {
          id?: number;
        } | null;

        showToast("Viaje registrado correctamente", "success");
        handleDialogClose();
        router.refresh();
        onSuccess?.({ mode: "create", tripId: data?.id });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo registrar el viaje";
        showToast(message, "error");
        throw error;
      }
    },
    [handleDialogClose, onSuccess, router, showToast],
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
      onSuccess?.({ mode: "edit", tripId: activeTrip.id });
    },
    [activeTrip, handleDialogClose, onSuccess, router, showToast],
  );

  const dialogSubmitHandler =
    mode === "create" ? handleCreateSubmit : handleEditSubmit;

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
      onSuccess?.({ mode: "edit", tripId: activeTrip.id });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al borrar el viaje";
      showToast(message, "error");
    } finally {
      setDeleteLoading(false);
    }
  }, [activeTrip, handleDialogClose, onSuccess, router, showToast]);

  return (
    <>
      <SimpleEntityDialogForm
        open={open}
        title={
          mode === "create"
            ? "Registrar nuevo viaje de camión"
            : activeTrip?.tripId
              ? `Editar viaje ${activeTrip.tripId}`
              : "Editar viaje de camión"
        }
        onClose={handleDialogClose}
        onSubmit={dialogSubmitHandler}
        fields={tripFormFields}
        sections={TRUCK_TRIP_FORM_SECTIONS}
        initialValues={dialogInitialValues}
        onFieldChange={handleDialogFieldChange}
        extraActions={
          mode === "edit" ? (
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
        externalValues={dialogInitialValues}
        externalValuesKey={initialValuesKey}
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
    </>
  );
};

export default TruckTripDialog;
