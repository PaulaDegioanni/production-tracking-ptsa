"use client";

import * as React from "react";
import { Button, Stack, Typography } from "@mui/material";

import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import {
  normalizeHarvestFormToBaserowPayload,
} from "@/lib/harvests/formPayload";
import { splitIsoToDateAndTimeLocal } from "@/lib/forms/datetime";
import type { HarvestDto } from "@/lib/baserow/harvests";

export type HarvestFormValues = {
  Fecha_fecha: string; // YYYY-MM-DD
  Fecha_hora: string; // HH:mm
  "KG Cosechados": string;
  Campo: "" | number;
  Lotes: Array<string | number>;
  "Ciclo de siembra": "" | number;
  Cultivo: string;
  Stock: Array<string | number>;
  "Viajes camión directos": Array<string | number>;
  Notas: string;
};

type Option = { id: number; label: string };
type CycleOption = Option & { crop: string };

type FieldDependencies = {
  lots: Option[];
  cycles: CycleOption[];
  stocks: Option[];
  truckTrips: Option[];
};

export type HarvestDialogProps = {
  open: boolean;
  mode?: "create" | "edit";
  activeHarvest?: HarvestDto | null;
  initialValues: HarvestFormValues;
  fieldId?: number | null;
  fieldLabel?: string;
  cycleLabel?: string | null;
  onClose: () => void;
  onSuccess?: (result: { id: number }) => void;
  hideCreateStockButton?: boolean;
  onCreateStock?: () => void;
};

const emptyDependencies: FieldDependencies = {
  lots: [],
  cycles: [],
  stocks: [],
  truckTrips: [],
};

const mergeOptions = <T extends { label: string; value: number }>(
  primary: T[],
  fallback: T[],
): T[] => {
  if (!fallback.length) return primary;
  const seen = new Set(primary.map((option) => option.value));
  const merged = [...primary];
  fallback.forEach((option) => {
    if (!seen.has(option.value)) {
      seen.add(option.value);
      merged.push(option);
    }
  });
  return merged;
};

const buildFallbackOptions = (
  ids: number[] | null | undefined,
  labels: string[] | null | undefined,
  labelForMissing: (id: number) => string,
): Array<{ label: string; value: number }> => {
  if (!Array.isArray(ids) || !ids.length) return [];
  return ids.map((id, index) => ({
    value: id,
    label: labels?.[index]?.trim() || labelForMissing(id),
  }));
};

const parseNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const HarvestDialog = ({
  open,
  mode = "create",
  activeHarvest = null,
  initialValues,
  fieldId,
  fieldLabel,
  cycleLabel,
  onClose,
  onSuccess,
  hideCreateStockButton = false,
  onCreateStock,
}: HarvestDialogProps) => {
  const [formInitialValues, setFormInitialValues] =
    React.useState<HarvestFormValues>(initialValues);
  const [formCurrentValues, setFormCurrentValues] =
    React.useState<HarvestFormValues>(initialValues);
  const [fieldOptions, setFieldOptions] = React.useState<Option[]>([]);
  const [fieldOptionsLoading, setFieldOptionsLoading] = React.useState(false);
  const [dependencies, setDependencies] =
    React.useState<FieldDependencies>(emptyDependencies);
  const [dependenciesLoading, setDependenciesLoading] =
    React.useState(false);
  const [dependenciesError, setDependenciesError] =
    React.useState<string | null>(null);

  const selectedFieldId = React.useMemo(
    () => parseNumericId(formCurrentValues.Campo),
    [formCurrentValues.Campo],
  );
  const selectedCycleId = React.useMemo(
    () => parseNumericId(formCurrentValues["Ciclo de siembra"]),
    [formCurrentValues],
  );

  const buildHarvestInitialValues = React.useCallback(
    (harvest: HarvestDto): HarvestFormValues => {
      const { date, time } = splitIsoToDateAndTimeLocal(harvest.date);
      const { date: todayDate, time: todayTime } = splitIsoToDateAndTimeLocal(
        new Date().toISOString(),
      );

      return {
        Fecha_fecha: date || todayDate,
        Fecha_hora: time || todayTime,
        "KG Cosechados":
          harvest.harvestedKgs != null ? String(harvest.harvestedKgs) : "",
        Campo: (harvest.fieldId ?? "") as "" | number,
        Lotes: (harvest.lotsIds ?? []) as Array<string | number>,
        "Ciclo de siembra": (harvest.cycleId ?? "") as "" | number,
        Cultivo: harvest.crop ?? "",
        Stock: (harvest.stockIds ?? []) as Array<string | number>,
        "Viajes camión directos": (harvest.directTruckTripIds ?? []) as Array<
          string | number
        >,
        Notas: harvest.notes ?? "",
      };
    },
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && activeHarvest) {
      const values = initialValues ?? buildHarvestInitialValues(activeHarvest);
      setFormInitialValues(values);
      setFormCurrentValues(values);
      return;
    }
    setFormInitialValues(initialValues);
    setFormCurrentValues(initialValues);
  }, [activeHarvest, buildHarvestInitialValues, initialValues, mode, open]);

  const normalizeHarvestDtoToBaserowPayload = React.useCallback(
    (harvest: HarvestDto): Record<string, any> => {
      const payload: Record<string, any> = {};

      if (harvest.date) {
        const parsedDate = new Date(harvest.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          payload.Fecha = parsedDate.toISOString();
        }
      }

      payload["KG Cosechados"] =
        typeof harvest.harvestedKgs === "number" ? harvest.harvestedKgs : 0;

      payload.Lotes = Array.isArray(harvest.lotsIds)
        ? [...harvest.lotsIds]
        : [];

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

      payload["Viajes camión directos"] = Array.isArray(
        harvest.directTruckTripIds,
      )
        ? harvest.directTruckTripIds.filter(
            (id): id is number => typeof id === "number" && !Number.isNaN(id),
          )
        : [];

      const notesValue =
        typeof harvest.notes === "string" ? harvest.notes.trim() : "";
      payload.Notas = notesValue;

      return payload;
    },
    [],
  );

  const normalizeArrayForComparison = React.useCallback((arr: unknown[]) => {
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
  }, []);

  const isEqualValue = React.useCallback(
    (a: unknown, b: unknown) => {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        const normalizedA = normalizeArrayForComparison(a);
        const normalizedB = normalizeArrayForComparison(b);
        return normalizedA.every((value, index) => value === normalizedB[index]);
      }
      return a === b;
    },
    [normalizeArrayForComparison],
  );

  const computeDiffPayload = React.useCallback(
    (prevPayload: Record<string, any>, nextPayload: Record<string, any>) => {
      const diff: Record<string, any> = {};
      Object.keys(nextPayload).forEach((key) => {
        if (!isEqualValue(prevPayload[key], nextPayload[key])) {
          diff[key] = nextPayload[key];
        }
      });
      return diff;
    },
    [isEqualValue],
  );

  const loadFieldOptions = React.useCallback(async () => {
    if (fieldId) {
      setFieldOptions([
        {
          id: fieldId,
          label: fieldLabel?.trim() || `Campo #${fieldId}`,
        },
      ]);
      return;
    }

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
      const data = (await response.json()) as { fields?: Option[] };
      setFieldOptions(Array.isArray(data.fields) ? data.fields : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al cargar los campos";
      setDependenciesError(message);
      setFieldOptions([]);
    } finally {
      setFieldOptionsLoading(false);
    }
  }, [fieldId, fieldLabel]);

  const loadDependencies = React.useCallback(
    async (campoId: number, campoName?: string) => {
      try {
        setDependenciesLoading(true);
        setDependenciesError(null);
        const params = new URLSearchParams({ campoId: String(campoId) });
        if (campoName) {
          params.set("campoName", campoName);
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
        const data = (await response.json()) as Partial<FieldDependencies>;
        setDependencies({
          lots: Array.isArray(data.lots) ? data.lots : [],
          cycles: Array.isArray(data.cycles) ? data.cycles : [],
          stocks: Array.isArray(data.stocks) ? data.stocks : [],
          truckTrips: Array.isArray(data.truckTrips) ? data.truckTrips : [],
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar las opciones dependientes";
        setDependenciesError(message);
      } finally {
        setDependenciesLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    void loadFieldOptions();
  }, [loadFieldOptions, open]);

  React.useEffect(() => {
    if (!open || !selectedFieldId) return;
    void loadDependencies(
      selectedFieldId,
      fieldOptions.find((field) => field.id === selectedFieldId)?.label ||
        fieldLabel,
    );
  }, [fieldLabel, fieldOptions, loadDependencies, open, selectedFieldId]);

  const handleFieldChange = React.useCallback(
    (_key: string, _rawValue: any, values?: Record<string, any>) => {
      if (values) {
        setFormCurrentValues(values as HarvestFormValues);
      }
    },
    [],
  );

  const sections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: "Información básica",
        fields: ["Fecha_fecha", "Fecha_hora", "KG Cosechados"],
      },
      {
        title: "Ubicación y origen",
        fields: ["Campo", "Lotes", "Ciclo de siembra", "Cultivo"],
      },
      {
        title: "Distribución",
        fields: ["Stock", "Viajes camión directos"],
      },
      {
        title: "Notas",
        fields: ["Notas"],
      },
    ],
    [],
  );

  const fields = React.useMemo<SimpleEntityDialogFieldConfig[]>(() => {
    const baseCampoOptions = fieldOptions.map((field) => ({
      label: field.label,
      value: field.id,
    }));
    const fallbackCampoOptions =
      mode === "edit" && activeHarvest?.fieldId
        ? [
            {
              value: activeHarvest.fieldId,
              label: activeHarvest.field || `Campo #${activeHarvest.fieldId}`,
            },
          ]
        : [];
    const campoOptions = mergeOptions(baseCampoOptions, fallbackCampoOptions);

    const baseLotsOptions = dependencies.lots.map((lot) => ({
      label: lot.label,
      value: lot.id,
    }));
    const fallbackLotsOptions =
      mode === "edit" && activeHarvest
        ? buildFallbackOptions(
            activeHarvest.lotsIds,
            activeHarvest.lotsLabels,
            (id) => `Lote #${id}`,
          )
        : [];
    const lotsOptions = mergeOptions(baseLotsOptions, fallbackLotsOptions);

    const baseCycleOptions = dependencies.cycles.map((cycle) => ({
      label: cycle.label,
      value: cycle.id,
      meta: { crop: cycle.crop },
    }));
    const fallbackCycleOptions: Array<{
      label: string;
      value: number;
      meta: { crop: string };
    }> = [];

    if (mode === "edit" && activeHarvest?.cycleId) {
      fallbackCycleOptions.push({
        value: activeHarvest.cycleId,
        label:
          activeHarvest.cycleLabel || `Ciclo #${activeHarvest.cycleId}`,
        meta: { crop: activeHarvest.crop ?? "" },
      });
    }

    if (
      selectedCycleId &&
      !baseCycleOptions.some((option) => option.value === selectedCycleId)
    ) {
      fallbackCycleOptions.push({
        label:
          cycleLabel?.trim() ||
          (formCurrentValues.Cultivo
            ? `Ciclo #${selectedCycleId} · ${formCurrentValues.Cultivo}`
            : `Ciclo #${selectedCycleId}`),
        value: selectedCycleId,
        meta: { crop: formCurrentValues.Cultivo ?? "" },
      });
    }

    const cycleOptions = mergeOptions(baseCycleOptions, fallbackCycleOptions);

    const baseStockOptions = dependencies.stocks.map((stock) => ({
      label: stock.label,
      value: stock.id,
    }));
    const fallbackStockOptions =
      mode === "edit" && activeHarvest
        ? buildFallbackOptions(
            activeHarvest.stockIds,
            activeHarvest.stockLabels,
            (id) => `Stock #${id}`,
          )
        : [];
    const stockOptions = mergeOptions(baseStockOptions, fallbackStockOptions);

    const baseTruckOptions = dependencies.truckTrips.map((trip) => ({
      label: trip.label,
      value: trip.id,
    }));
    const fallbackTruckOptions =
      mode === "edit" && activeHarvest
        ? buildFallbackOptions(
            activeHarvest.directTruckTripIds,
            activeHarvest.directTruckLabels,
            (id) => `Viaje #${id}`,
          )
        : [];
    const truckOptions = mergeOptions(baseTruckOptions, fallbackTruckOptions);

    const showDependenciesError =
      Boolean(dependenciesError) &&
      !dependencies.lots.length &&
      !dependencies.cycles.length &&
      !dependencies.stocks.length &&
      !dependencies.truckTrips.length;
    const dependentHelperText = selectedFieldId
      ? (showDependenciesError ? dependenciesError ?? undefined : undefined)
      : "Seleccioná un campo primero";
    const dependentDisabled = !selectedFieldId || dependenciesLoading;

    const stockHelperContent =
      !hideCreateStockButton && onCreateStock ? (
        <Stack spacing={0.5} alignItems="flex-start">
          <Button
            variant="text"
            size="small"
            onClick={onCreateStock}
            sx={{ px: 0, textTransform: "none" }}
            disabled={dependenciesLoading}
          >
            + Nuevo stock
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
        disabled: Boolean(fieldId),
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
        type: "multi-select",
        options: stockOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
        helperContent: stockHelperContent,
      },
      {
        key: "Viajes camión directos",
        label: "Viajes de camión",
        type: "multi-select",
        options: truckOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
      },
      {
        key: "Notas",
        label: "Notas",
        type: "textarea",
      },
    ];
  }, [
    dependencies,
    dependenciesError,
    dependenciesLoading,
    fieldId,
    fieldOptions,
    fieldOptionsLoading,
    hideCreateStockButton,
    onCreateStock,
    selectedCycleId,
    selectedFieldId,
    cycleLabel,
    formCurrentValues,
    activeHarvest,
    mode,
  ]);

  const handleSubmit = React.useCallback(
    async (values: Record<string, any>) => {
      if (mode === "edit") {
        if (!activeHarvest) {
          throw new Error("No se encontró la cosecha a editar");
        }
        const nextPayload = normalizeHarvestFormToBaserowPayload(values, {
          includeEmptyOptional: true,
        });
        const prevPayload = normalizeHarvestDtoToBaserowPayload(activeHarvest);
        const diffPayload = computeDiffPayload(prevPayload, nextPayload);
        if (!Object.keys(diffPayload).length) {
          throw new Error("No hay cambios para guardar");
        }
        const response = await fetch(`/api/harvests/${activeHarvest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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
          throw new Error(message);
        }
        onSuccess?.({ id: activeHarvest.id });
        return;
      }

      const payload = normalizeHarvestFormToBaserowPayload(values);
      const response = await fetch("/api/harvests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo crear la cosecha";
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
      const created = (await response.json()) as { id: number };
      onSuccess?.({ id: created.id });
    },
    [
      activeHarvest,
      computeDiffPayload,
      mode,
      normalizeHarvestDtoToBaserowPayload,
      onSuccess,
    ],
  );

  return (
    <SimpleEntityDialogForm
      open={open}
      title={
        mode === "edit"
          ? activeHarvest?.harvestId
            ? `Editar cosecha ${activeHarvest.harvestId}`
            : "Editar cosecha"
          : "Nueva cosecha"
      }
      onClose={onClose}
      onSubmit={handleSubmit}
      fields={fields}
      sections={sections}
      initialValues={formInitialValues}
      onFieldChange={handleFieldChange}
      topContent={
        dependenciesError && !selectedFieldId ? (
          <Typography variant="caption" color="error.main">
            {dependenciesError}
          </Typography>
        ) : null
      }
    />
  );
};

export default HarvestDialog;
