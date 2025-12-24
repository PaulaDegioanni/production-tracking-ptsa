"use client";

import * as React from "react";
import { Alert, Snackbar } from "@mui/material";

import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import type { CycleCreateValues } from "@/lib/baserow/cycles";

type Option = { id: number; label: string };

type CycleFormValues = {
  Campo: number | "";
  Lotes: Array<number | string>;
  "Fecha inicio barbecho": string;
  "Fecha de siembra": string;
  "Duración cultivo (días)": string;
  "Fecha estimada de cosecha": string;
  Cultivo: number | "";
  Estado: number | "";
  Semilla: string;
  "Rendimiento esperado (qq/ha)": string;
  Notas: string;
};

const getDefaultCycleFormValues = (): CycleFormValues => ({
  Campo: "",
  Lotes: [],
  "Fecha inicio barbecho": "",
  "Fecha de siembra": "",
  "Duración cultivo (días)": "",
  "Fecha estimada de cosecha": "",
  Cultivo: "",
  Estado: "",
  Semilla: "",
  "Rendimiento esperado (qq/ha)": "",
  Notas: "",
});

const computeEstimatedHarvestDate = (
  sowingDate?: string,
  durationInput?: string,
): string => {
  if (!sowingDate || !durationInput) return "";
  const durationDays = Number(durationInput);
  if (!Number.isFinite(durationDays)) return "";
  const date = new Date(sowingDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Math.round(durationDays));
  return date.toISOString().slice(0, 10);
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
};

type CycleCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { cycleId: number }) => void;
};

const CycleCreateDialog = ({
  open,
  onClose,
  onSuccess,
}: CycleCreateDialogProps) => {
  const [fieldOptions, setFieldOptions] = React.useState<Option[]>([]);
  const [fieldOptionsLoading, setFieldOptionsLoading] = React.useState(false);
  const [fieldOptionsError, setFieldOptionsError] = React.useState<
    string | null
  >(null);

  const [selectedField, setSelectedField] = React.useState<Option | null>(null);
  const [lotOptions, setLotOptions] = React.useState<Option[]>([]);
  const [lotOptionsLoading, setLotOptionsLoading] = React.useState(false);
  const [lotOptionsError, setLotOptionsError] = React.useState<string | null>(
    null,
  );

  const [cropOptions, setCropOptions] = React.useState<Option[]>([]);
  const [statusOptions, setStatusOptions] = React.useState<Option[]>([]);

  const [dialogInitialValues, setDialogInitialValues] = React.useState(
    getDefaultCycleFormValues(),
  );
  const [dialogCurrentValues, setDialogCurrentValues] = React.useState(
    getDefaultCycleFormValues(),
  );
  const [dialogValuesPatch, setDialogValuesPatch] = React.useState<{
    data: Partial<CycleFormValues>;
    key: number;
  } | null>(null);
  const dialogPatchKeyRef = React.useRef(0);

  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbarClose = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const applyDialogValuePatch = React.useCallback(
    (data: Partial<CycleFormValues>) => {
      dialogPatchKeyRef.current += 1;
      setDialogValuesPatch({ data, key: dialogPatchKeyRef.current });
      setDialogCurrentValues((prev) => ({ ...prev, ...data }));
    },
    [],
  );

  const resetDialogState = React.useCallback(() => {
    const defaults = getDefaultCycleFormValues();
    setDialogInitialValues(defaults);
    setDialogCurrentValues(defaults);
    dialogPatchKeyRef.current = 0;
    setDialogValuesPatch(null);
    setSelectedField(null);
    setLotOptions([]);
    setFieldOptionsError(null);
    setLotOptionsError(null);
  }, []);

  const fetchBaseOptions = React.useCallback(async () => {
    try {
      setFieldOptionsLoading(true);
      setFieldOptionsError(null);
      const response = await fetch("/api/cycles/options", {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          errorBody || "No se pudieron cargar las opciones iniciales",
        );
      }
      const data = (await response.json()) as {
        fields?: Option[];
        cropOptions?: { id: number; value: string }[];
        statusOptions?: { id: number; value: string }[];
        cropDefaultId?: number | null;
        statusDefaultId?: number | null;
      };

      const mappedFields = Array.isArray(data.fields) ? data.fields : [];
      setFieldOptions(mappedFields);

      const mappedCrops = Array.isArray(data.cropOptions)
        ? data.cropOptions.map((option) => ({
            id: option.id,
            label: option.value,
          }))
        : [];
      const mappedStatuses = Array.isArray(data.statusOptions)
        ? data.statusOptions.map((option) => ({
            id: option.id,
            label: option.value,
          }))
        : [];
      setCropOptions(mappedCrops);
      setStatusOptions(mappedStatuses);

      const defaultsPatch: Partial<CycleFormValues> = {};
      if (data.cropDefaultId) {
        defaultsPatch.Cultivo = data.cropDefaultId;
      }
      if (data.statusDefaultId) {
        defaultsPatch.Estado = data.statusDefaultId;
      }

      if (Object.keys(defaultsPatch).length) {
        applyDialogValuePatch(defaultsPatch);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al cargar opciones";
      setFieldOptionsError(message);
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setFieldOptionsLoading(false);
    }
  }, [applyDialogValuePatch]);

  const fetchLotOptions = React.useCallback(async (fieldId: number) => {
    if (!fieldId || Number.isNaN(fieldId)) {
      setLotOptions([]);
      setLotOptionsError(null);
      return;
    }
    try {
      setLotOptionsLoading(true);
      setLotOptionsError(null);
      const response = await fetch(`/api/cycles/options?campoId=${fieldId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          errorBody || "No se pudieron cargar los lotes del campo",
        );
      }
      const data = (await response.json()) as {
        lots?: Option[];
      };
      setLotOptions(
        Array.isArray(data.lots)
          ? data.lots.sort((a, b) => a.label.localeCompare(b.label))
          : [],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error inesperado al cargar los lotes";
      setLotOptionsError(message);
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLotOptionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      resetDialogState();
      fetchBaseOptions();
    } else {
      setDialogValuesPatch(null);
    }
  }, [fetchBaseOptions, open, resetDialogState]);

  const handleDialogFieldChange = React.useCallback(
    (key: string, rawValue: any, values?: Record<string, any>) => {
      if (values) {
        setDialogCurrentValues(values as CycleFormValues);
      }

      if (key === "Campo") {
        const parsedValue =
          typeof rawValue === "number" ? rawValue : Number(rawValue || "");
        if (!parsedValue || Number.isNaN(parsedValue)) {
          setSelectedField(null);
          setLotOptions([]);
          setLotOptionsError(null);
          return;
        }
        const matched =
          fieldOptions.find((option) => option.id === parsedValue) ?? null;
        setSelectedField(matched);
        fetchLotOptions(parsedValue);
      }

      if (key === "Fecha de siembra" || key === "Duración cultivo (días)") {
        const nextValues = (values as CycleFormValues) ?? dialogCurrentValues;
        const estimated = computeEstimatedHarvestDate(
          nextValues["Fecha de siembra"],
          nextValues["Duración cultivo (días)"],
        );
        if (
          estimated !== nextValues["Fecha estimada de cosecha"] &&
          !(estimated === "" && !nextValues["Fecha estimada de cosecha"])
        ) {
          applyDialogValuePatch({
            "Fecha estimada de cosecha": estimated,
          });
        } else if (!estimated) {
          applyDialogValuePatch({
            "Fecha estimada de cosecha": "",
          });
        }
      }
    },
    [applyDialogValuePatch, dialogCurrentValues, fieldOptions, fetchLotOptions],
  );

  const sections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: "Ubicación y lotes",
        fields: ["Campo", "Lotes"],
      },
      {
        title: "Fechas y duración",
        fields: [
          "Fecha inicio barbecho",
          "Fecha de siembra",
          "Duración cultivo (días)",
          "Fecha estimada de cosecha",
        ],
      },
      {
        title: "Detalles",
        fields: [
          "Cultivo",
          "Estado",
          "Semilla",
          "Rendimiento esperado (qq/ha)",
        ],
      },
      {
        title: "Notas",
        fields: ["Notas"],
      },
    ],
    [],
  );

  const lotHelperText = selectedField
    ? (lotOptionsError ?? undefined)
    : "Seleccioná un campo primero";

  const fields = React.useMemo<SimpleEntityDialogFieldConfig[]>(() => {
    const fieldOptionItems = fieldOptions.map((option) => ({
      label: option.label,
      value: option.id,
    }));

    const lotOptionItems = lotOptions.map((option) => ({
      label: option.label,
      value: option.id,
    }));

    const cropOptionItems = cropOptions.map((option) => ({
      label: option.label,
      value: option.id,
    }));

    const statusOptionItems = statusOptions.map((option) => ({
      label: option.label,
      value: option.id,
    }));

    return [
      {
        key: "Campo",
        label: "Campo",
        type: "select",
        required: true,
        options: fieldOptionItems,
        loading: fieldOptionsLoading,
        helperText: fieldOptionsError ?? undefined,
        onValueChange: () => ({
          Lotes: [],
        }),
      },
      {
        key: "Lotes",
        label: "Lotes",
        type: "multi-select",
        required: true,
        options: lotOptionItems,
        loading: lotOptionsLoading,
        disabled: !selectedField,
        helperText: lotHelperText,
      },
      {
        key: "Fecha inicio barbecho",
        label: "Fecha inicio barbecho",
        type: "date",
      },
      {
        key: "Fecha de siembra",
        label: "Fecha de siembra",
        type: "date",
      },
      {
        key: "Duración cultivo (días)",
        label: "Duración de cultivo (días)",
        type: "number",
        step: 1,
      },
      {
        key: "Fecha estimada de cosecha",
        label: "Fecha estimada de cosecha",
        type: "readonly",
        helperText:
          "Se calcula automáticamente con fecha de siembra + duración.",
      },
      {
        key: "Cultivo",
        label: "Cultivo",
        type: "select",
        required: true,
        options: cropOptionItems,
        loading: fieldOptionsLoading,
      },
      {
        key: "Estado",
        label: "Estado",
        type: "select",
        required: true,
        options: statusOptionItems,
        loading: fieldOptionsLoading,
      },
      {
        key: "Semilla",
        label: "Semilla",
        type: "text",
        placeholder: "Ingresá la semilla utilizada",
      },
      {
        key: "Rendimiento esperado (qq/ha)",
        label: "Rendimiento esperado (qq/ha)",
        type: "number",
        step: 0.01,
        placeholder: "0.00",
      },
      {
        key: "Notas",
        label: "Notas",
        type: "textarea",
        placeholder: "Observaciones adicionales",
      },
    ];
  }, [
    cropOptions,
    fieldOptions,
    fieldOptionsLoading,
    fieldOptionsError,
    lotHelperText,
    lotOptions,
    lotOptionsLoading,
    selectedField,
    statusOptions,
  ]);

  const buildCreateValues = React.useCallback(
    (values: CycleFormValues): CycleCreateValues => {
      const lotIds = Array.isArray(values.Lotes)
        ? values.Lotes.map((value) =>
            typeof value === "number" ? value : Number(value),
          ).filter((value) => Number.isFinite(value) && value > 0)
        : [];

      const expectedYieldRaw = values["Rendimiento esperado (qq/ha)"];
      const expectedYield =
        expectedYieldRaw && expectedYieldRaw !== ""
          ? Number(expectedYieldRaw)
          : null;

      const durationRaw = values["Duración cultivo (días)"];
      const cropDurationDays =
        durationRaw && durationRaw !== "" ? Number(durationRaw) : null;

      return {
        lotIds,
        fallowStartDate: values["Fecha inicio barbecho"] || null,
        sowingDate: values["Fecha de siembra"] || null,
        cropOptionId: values.Cultivo ? Number(values.Cultivo) : null,
        statusOptionId: values.Estado ? Number(values.Estado) : null,
        seed: values.Semilla?.trim() || undefined,
        expectedYield:
          expectedYield !== null && Number.isFinite(expectedYield)
            ? expectedYield
            : null,
        notes: values.Notas?.trim() || undefined,
        cropDurationDays:
          cropDurationDays !== null && Number.isFinite(cropDurationDays)
            ? cropDurationDays
            : null,
      };
    },
    [],
  );

  const handleSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      const values = formValues as CycleFormValues;
      const payload = buildCreateValues(values);
      const response = await fetch("/api/cycles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: payload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = "No se pudo crear el ciclo";
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
      onSuccess?.({ cycleId: created.id });
    },
    [buildCreateValues, onSuccess],
  );

  return (
    <>
      <SimpleEntityDialogForm
        open={open}
        title="Nuevo ciclo de siembra"
        onClose={onClose}
        onSubmit={handleSubmit}
        fields={fields}
        sections={sections}
        initialValues={dialogInitialValues}
        onFieldChange={handleDialogFieldChange}
        externalValues={dialogValuesPatch?.data ?? null}
        externalValuesKey={dialogValuesPatch?.key ?? null}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CycleCreateDialog;
