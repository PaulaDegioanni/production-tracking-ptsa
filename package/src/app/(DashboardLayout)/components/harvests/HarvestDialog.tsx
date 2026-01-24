"use client";

import * as React from "react";
import { Button, Stack, Typography } from "@mui/material";

import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import { normalizeHarvestFormToBaserowPayload } from "@/lib/harvests/formPayload";

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

  React.useEffect(() => {
    if (!open) return;
    setFormInitialValues(initialValues);
    setFormCurrentValues(initialValues);
  }, [open, initialValues]);

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
      setFormError(message);
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
    const campoOptions = fieldOptions.map((field) => ({
      label: field.label,
      value: field.id,
    }));

    const lotsOptions = dependencies.lots.map((lot) => ({
      label: lot.label,
      value: lot.id,
    }));

    const baseCycleOptions = dependencies.cycles.map((cycle) => ({
      label: cycle.label,
      value: cycle.id,
      meta: { crop: cycle.crop },
    }));
    const fallbackCycleOptions =
      selectedCycleId &&
      !baseCycleOptions.some((option) => option.value === selectedCycleId)
        ? [
            {
              label:
                cycleLabel?.trim() ||
                (formCurrentValues.Cultivo
                  ? `Ciclo #${selectedCycleId} · ${formCurrentValues.Cultivo}`
                  : `Ciclo #${selectedCycleId}`),
              value: selectedCycleId,
              meta: { crop: formCurrentValues.Cultivo ?? "" },
            },
          ]
        : [];
    const cycleOptions = [...baseCycleOptions, ...fallbackCycleOptions];

    const stockOptions = dependencies.stocks.map((stock) => ({
      label: stock.label,
      value: stock.id,
    }));

    const truckOptions = dependencies.truckTrips.map((trip) => ({
      label: trip.label,
      value: trip.id,
    }));

    const dependentHelperText = selectedFieldId
      ? (dependenciesError ?? undefined)
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
  ]);

  const handleSubmit = React.useCallback(
    async (values: Record<string, any>) => {
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
    [onSuccess],
  );

  return (
    <SimpleEntityDialogForm
      open={open}
      title="Nueva cosecha"
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
