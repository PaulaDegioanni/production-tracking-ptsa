'use client';

import * as React from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useRouter } from 'next/navigation';

import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from '@/components/forms/SimpleEntityDialogForm';
import type { StockDto } from '@/lib/baserow/stocks';
import { normalizeStockFormToBaserowPayload } from '@/lib/stocks/formPayload';
import { findMatchingFieldOption } from '@/lib/fields/fieldMatching';

export type Option = {
  id: number;
  label: string;
};

type CycleOption = Option & {
  crop: string;
};

type FieldDependencies = {
  cycles: CycleOption[];
};

const emptyDependencies: FieldDependencies = {
  cycles: [],
};

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
};

export type StockFormValues = {
  'Tipo unidad': number | '';
  Campo: number | '';
  'Ciclo de siembra': number | '';
  Cultivo: string;
  'Fecha de creación': string;
  Estado: number | '';
  Notas: string;
  ID: string;
  'Kgs actuales': string;
  'Total kgs ingresados': string;
  'Total kgs egresados': string;
  'Cosechas asociadas': string[];
  'Viajes de camión desde stock': string[];
};

export type StockDialogMode = 'create' | 'edit';

export type StockDialogProps = {
  open: boolean;
  mode: StockDialogMode;
  activeStock: StockDto | null;
  initialValues: StockFormValues;
  unitTypeOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSuccess?: (result: { mode: StockDialogMode; stockId?: number }) => void;
};

const createChipRenderer =
  (
    title: string,
    emptyLabel: string
  ): NonNullable<SimpleEntityDialogFieldConfig['renderValue']> =>
  ({ value }) => {
    const chips = Array.isArray(value)
      ? (value as string[]).filter(
          (chip) => typeof chip === 'string' && chip.trim() !== ''
        )
      : [];

    return (
      <Stack spacing={1}>
        <Typography variant="subtitle1" color="text.secondary">
          {title}
        </Typography>
        {chips.length ? (
          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{
              columnGap: 0.75,
              rowGap: 0.75,
            }}
          >
            {chips.map((chip, index) => (
              <Chip
                key={`${title}-${index}-${chip}`}
                label={chip}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  maxWidth: '100%',
                }}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyLabel}
          </Typography>
        )}
      </Stack>
    );
  };

const renderHarvestChipField = createChipRenderer(
  'Cosechas asociadas',
  'Sin cosechas asociadas'
);
const renderTruckChipField = createChipRenderer(
  'Viajes de camión desde stock',
  'Sin viajes asociados'
);

const normalizeStockDtoToBaserowPayload = (stock: StockDto) => {
  const payload: Record<string, any> = {};
  const cycleId = stock.cycleIds?.[0];
  payload['Tipo unidad'] = stock.unitTypeId ?? null;
  payload['Ciclo de siembra'] = cycleId ? [cycleId] : [];
  payload['Fecha de creación'] = stock.createdAt
    ? stock.createdAt.slice(0, 10)
    : '';
  payload.Estado = stock.statusId ?? null;
  payload.Notas = stock.notes ?? '';
  return payload;
};

const normalizeArrayForComparison = (arr: unknown[]) => {
  if (!arr.length) return [];

  if (arr.every((value) => typeof value === 'number')) {
    return [...arr].sort(
      (a, b) => (Number(a) || 0) - (Number(b) || 0)
    ) as number[];
  }

  if (arr.every((value) => typeof value === 'string')) {
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
  nextPayload: Record<string, any>
) => {
  const diff: Record<string, any> = {};

  Object.keys(nextPayload).forEach((key) => {
    if (!isEqualValue(prevPayload[key], nextPayload[key])) {
      diff[key] = nextPayload[key];
    }
  });

  return diff;
};

const parseErrorResponse = async (
  response: Response,
  fallback: string
): Promise<string> => {
  const errorBody = await response.text();
  if (!errorBody) return fallback;
  try {
    const parsed = JSON.parse(errorBody);
    return parsed?.error || errorBody;
  } catch {
    return errorBody;
  }
};

const StockDialog = ({
  open,
  mode,
  activeStock,
  initialValues,
  unitTypeOptions,
  statusOptions,
  onClose,
  onSuccess,
}: StockDialogProps) => {
  const router = useRouter();
  const [snackbarState, setSnackbarState] = React.useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [fieldOptions, setFieldOptions] = React.useState<Option[]>([]);
  const [fieldOptionsLoading, setFieldOptionsLoading] = React.useState(false);
  const [selectedField, setSelectedField] = React.useState<Option | null>(null);
  const [dependenciesCache, setDependenciesCache] = React.useState<
    Record<number, FieldDependencies>
  >({});
  const dependenciesCacheRef = React.useRef<Record<number, FieldDependencies>>(
    {}
  );
  const [dependenciesLoading, setDependenciesLoading] = React.useState(false);
  const [dependenciesError, setDependenciesError] = React.useState<
    string | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [formValuesPatch, setFormValuesPatch] = React.useState<{
    data: Partial<StockFormValues>;
    key: number;
  } | null>(null);
  const patchKeyRef = React.useRef(0);

  const applyFormValuePatch = React.useCallback(
    (data: Partial<StockFormValues>) => {
      patchKeyRef.current += 1;
      setFormValuesPatch({
        data,
        key: patchKeyRef.current,
      });
    },
    []
  );

  const currentDependencies = React.useMemo(() => {
    if (!selectedField) return emptyDependencies;
    return dependenciesCache[selectedField.id] ?? emptyDependencies;
  }, [dependenciesCache, selectedField]);

  const showToast = React.useCallback(
    (message: string, severity: 'success' | 'error' | 'info') => {
      setSnackbarState({
        open: true,
        message,
        severity,
      });
    },
    []
  );

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const handleDialogClose = React.useCallback(() => {
    setSelectedField(null);
    setDependenciesError(null);
    setDeleteConfirmOpen(false);
    setDeleteLoading(false);
    setFormValuesPatch(null);
    patchKeyRef.current = 0;
    onClose();
  }, [onClose]);

  const fetchFieldOptions = React.useCallback(async (): Promise<Option[]> => {
    let fields: Option[] = [];
    try {
      setFieldOptionsLoading(true);
      const response = await fetch('/api/stocks/options', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(
          await parseErrorResponse(
            response,
            'No se pudieron cargar los campos disponibles'
          )
        );
      }

      const data = (await response.json()) as { fields?: Option[] };
      fields = Array.isArray(data.fields) ? data.fields : [];
      setFieldOptions(fields);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al cargar la lista de campos';
      showToast(message, 'error');
      fields = [];
    } finally {
      setFieldOptionsLoading(false);
    }
    return fields;
  }, [showToast]);

  const fetchFieldDependencies = React.useCallback(
    async (field: Option) => {
      if (!field) return;
      if (dependenciesCacheRef.current[field.id]) return;

      try {
        setDependenciesLoading(true);
        setDependenciesError(null);

        const params = new URLSearchParams({
          campoId: String(field.id),
        });
        if (field.label) {
          params.set('campoName', field.label);
        }

        const response = await fetch(
          `/api/stocks/options?${params.toString()}`,
          {
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error(
            await parseErrorResponse(
              response,
              'No se pudieron cargar los ciclos para el campo seleccionado'
            )
          );
        }

        const data = (await response.json()) as {
          cycles?: CycleOption[];
        };

        setDependenciesCache((prev) => ({
          ...prev,
          [field.id]: {
            cycles: Array.isArray(data.cycles) ? data.cycles : [],
          },
        }));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cargar las opciones dependientes';
        setDependenciesError(message);
        showToast(message, 'error');
      } finally {
        setDependenciesLoading(false);
      }
    },
    [showToast]
  );

  React.useEffect(() => {
    dependenciesCacheRef.current = dependenciesCache;
  }, [dependenciesCache]);

  React.useEffect(() => {
    if (open && !fieldOptions.length && !fieldOptionsLoading) {
      void fetchFieldOptions();
    }
  }, [open, fieldOptions.length, fieldOptionsLoading, fetchFieldOptions]);

  React.useEffect(() => {
    if (!open) return;

    const campoValue = initialValues.Campo;
    const hasCampoValue =
      campoValue !== '' && campoValue !== null && campoValue !== undefined;
    const parsedCampoId =
      typeof campoValue === 'number'
        ? campoValue
        : hasCampoValue
        ? Number(campoValue)
        : NaN;

    const candidateId =
      !Number.isNaN(parsedCampoId) && parsedCampoId
        ? parsedCampoId
        : activeStock?.fieldId ?? null;

    if (!candidateId) {
      setDependenciesError(null);
      return;
    }

    const matchedField =
      findMatchingFieldOption(fieldOptions, {
        id: candidateId,
        label: activeStock?.field ?? null,
      }) ?? null;

    if (!matchedField) {
      if (!selectedField || selectedField.id !== candidateId) {
        const fallbackLabel = activeStock?.field ?? `Campo #${candidateId}`;
        setSelectedField({ id: candidateId, label: fallbackLabel });
      }
      return;
    }

    setSelectedField(matchedField);

    const currentValueId =
      typeof campoValue === 'number'
        ? campoValue
        : Number(campoValue || NaN);

    if (
      !currentValueId ||
      Number.isNaN(currentValueId) ||
      currentValueId !== matchedField.id
    ) {
      applyFormValuePatch({ Campo: matchedField.id });
    }

    if (!dependenciesCacheRef.current[matchedField.id]) {
      void fetchFieldDependencies(matchedField);
    }
  }, [
    open,
    fieldOptions,
    fetchFieldDependencies,
    activeStock,
    initialValues.Campo,
    selectedField,
    applyFormValuePatch,
  ]);

  const handleDialogFieldChange = React.useCallback(
    (key: string, rawValue: any) => {
      if (key !== 'Campo') return;

      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        setSelectedField(null);
        setDependenciesError(null);
        return;
      }

      const parsedValue =
        typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!parsedValue || Number.isNaN(parsedValue)) {
        setSelectedField(null);
        setDependenciesError(null);
        return;
      }

      const field =
        fieldOptions.find((option) => option.id === parsedValue) ?? {
          id: parsedValue,
          label: `Campo #${parsedValue}`,
        };
      setSelectedField(field);
      setDependenciesError(null);

      if (field) {
        void fetchFieldDependencies(field);
      }
    },
    [fieldOptions, fetchFieldDependencies]
  );

  const handleCreateSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      const payload = normalizeStockFormToBaserowPayload(formValues);

      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(
          response,
          'No se pudo registrar el stock'
        );
        showToast(message, 'error');
        throw new Error(message);
      }

      const data = (await response.json().catch(() => null)) as
        | { id?: number }
        | null;

      showToast('Stock registrado correctamente', 'success');
      router.refresh();
      onSuccess?.({ mode: 'create', stockId: data?.id });
    },
    [onSuccess, router, showToast]
  );

  const handleEditSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      if (!activeStock) {
        const message = 'No se encontró el stock a editar';
        showToast(message, 'error');
        throw new Error(message);
      }

      const nextPayload = normalizeStockFormToBaserowPayload(formValues, {
        includeEmptyOptional: true,
      });
      const prevPayload = normalizeStockDtoToBaserowPayload(activeStock);
      const diffPayload = computeDiffPayload(prevPayload, nextPayload);

      if (!Object.keys(diffPayload).length) {
        showToast('No hay cambios para guardar', 'info');
        return;
      }

      const response = await fetch(`/api/stocks/${activeStock.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload: diffPayload }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(
          response,
          'No se pudo actualizar el stock'
        );
        showToast(message, 'error');
        throw new Error(message);
      }

      showToast('Stock actualizado correctamente', 'success');
      router.refresh();
      onSuccess?.({ mode: 'edit', stockId: activeStock.id });
    },
    [activeStock, onSuccess, router, showToast]
  );

  const openDeleteConfirm = React.useCallback(() => {
    if (!activeStock) return;
    setDeleteConfirmOpen(true);
  }, [activeStock]);

  const handleCloseDeleteConfirm = React.useCallback(() => {
    if (deleteLoading) return;
    setDeleteConfirmOpen(false);
  }, [deleteLoading]);

  const handleDeleteConfirmed = React.useCallback(async () => {
    if (!activeStock) {
      showToast('No se encontró el stock a borrar', 'error');
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/stocks/${activeStock.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(
          await parseErrorResponse(response, 'No se pudo borrar el stock')
        );
      }

      showToast('Stock borrado correctamente', 'success');
      setDeleteConfirmOpen(false);
      handleDialogClose();
      router.refresh();
      onSuccess?.({ mode: 'edit', stockId: activeStock.id });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al borrar el stock';
      showToast(message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  }, [activeStock, handleDialogClose, onSuccess, router, showToast]);

  const dialogTitle =
    mode === 'create'
      ? 'Registrar nuevo stock'
      : activeStock?.name
      ? `Editar stock ${activeStock.name}`
      : activeStock
      ? `Editar stock #${activeStock.id}`
      : 'Editar stock';

  const stockFormSections = React.useMemo<SimpleEntityDialogSection[]>(() => {
    const sections: SimpleEntityDialogSection[] = [
      {
        title: 'Información básica',
        description: 'Tipo de unidad, fecha de creación y estado',
        fields: ['Tipo unidad', 'Fecha de creación', 'Estado'],
      },
      {
        title: 'Origen',
        description: 'Campo, ciclo y cultivo asociados',
        fields: ['Campo', 'Ciclo de siembra', 'Cultivo'],
      },
    ];

    if (mode === 'edit') {
      sections.push({
        title: 'Resumen',
        description: 'Datos calculados del stock',
        fields: [
          'ID',
          'Kgs actuales',
          'Total kgs ingresados',
          'Total kgs egresados',
        ],
      });

      sections.push({
        title: 'Movimientos',
        description: 'Relación con cosechas y viajes de camión',
        fields: ['Cosechas asociadas', 'Viajes de camión desde stock'],
      });
    }

    sections.push({
      title: 'Notas',
      description: 'Observaciones y comentarios adicionales',
      fields: ['Notas'],
    });

    return sections;
  }, [mode]);

  const stockFormFields = React.useMemo<SimpleEntityDialogFieldConfig[]>(() => {
    const campoOptions = fieldOptions.map((field) => ({
      label: field.label,
      value: field.id,
    }));

    const cycleOptions = currentDependencies.cycles.map((cycle) => ({
      label: cycle.label,
      value: cycle.id,
      meta: { crop: cycle.crop },
    }));

    const unitTypeSelectOptions = unitTypeOptions.map((o) => ({
      label: o.label,
      value: o.id,
    }));

    const statusSelectOptions = statusOptions.map((o) => ({
      label: o.label,
      value: o.id,
    }));

    const dependentHelperText = selectedField
      ? dependenciesError ?? undefined
      : 'Seleccioná un campo primero';
    const dependentDisabled = !selectedField || dependenciesLoading;

    const fields: SimpleEntityDialogFieldConfig[] = [
      {
        key: 'Tipo unidad',
        label: 'Tipo de unidad',
        type: 'select',
        required: true,
        options: unitTypeSelectOptions,
      },
      {
        key: 'Fecha de creación',
        label: 'Fecha de creación',
        type: 'date',
        required: true,
      },
      {
        key: 'Estado',
        label: 'Estado',
        type: 'select',
        required: true,
        options: statusSelectOptions,
      },
      {
        key: 'Campo',
        label: 'Campo',
        type: 'select',
        required: true,
        options: campoOptions,
        loading: fieldOptionsLoading,
        onValueChange: () => ({
          'Ciclo de siembra': '',
          Cultivo: '',
        }),
      },
      {
        key: 'Ciclo de siembra',
        label: 'Ciclo de siembra',
        type: 'select',
        required: false,
        options: cycleOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
        onValueChange: (value) => {
          const cycle = cycleOptions.find((option) => option.value === value);
          return {
            Cultivo: cycle?.meta?.crop ?? '',
          };
        },
      },
      {
        key: 'Cultivo',
        label: 'Cultivo',
        type: 'readonly',
        helperText: 'Se completa automáticamente según el ciclo',
      },
    ];

    if (mode === 'edit') {
      fields.push(
        {
          key: 'ID',
          label: 'ID',
          type: 'readonly',
        },
        {
          key: 'Kgs actuales',
          label: 'Kgs actuales',
          type: 'readonly',
        },
        {
          key: 'Total kgs ingresados',
          label: 'Total kgs ingresados',
          type: 'readonly',
        },
        {
          key: 'Total kgs egresados',
          label: 'Total kgs egresados',
          type: 'readonly',
        },
        {
          key: 'Cosechas asociadas',
          label: 'Cosechas asociadas',
          type: 'readonly',
          helperText: 'Resumen de cosechas vinculadas',
          renderValue: renderHarvestChipField,
        },
        {
          key: 'Viajes de camión desde stock',
          label: 'Viajes de camión desde stock',
          type: 'readonly',
          helperText: 'Resumen de viajes directos asociados',
          renderValue: renderTruckChipField,
        }
      );
    }

    fields.push({
      key: 'Notas',
      label: 'Notas',
      type: 'textarea',
      placeholder: 'Escribí tus observaciones...',
    });

    return fields;
  }, [
    currentDependencies.cycles,
    dependenciesError,
    dependenciesLoading,
    fieldOptions,
    fieldOptionsLoading,
    mode,
    selectedField,
    statusOptions,
    unitTypeOptions,
  ]);

  const dialogSubmitHandler =
    mode === 'create' ? handleCreateSubmit : handleEditSubmit;

  return (
    <>
      <SimpleEntityDialogForm
        open={open}
        title={dialogTitle}
        onClose={handleDialogClose}
        onSubmit={dialogSubmitHandler}
        fields={stockFormFields}
        sections={stockFormSections}
        initialValues={initialValues}
        onFieldChange={handleDialogFieldChange}
        externalValues={formValuesPatch?.data ?? null}
        externalValuesKey={formValuesPatch?.key ?? null}
        showCancel={false}
        extraActionsInline
        extraActions={
          mode === 'edit' ? (
            <Button
              color="error"
              variant="outlined"
              onClick={openDeleteConfirm}
              startIcon={<DeleteOutlineIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
              }}
            >
              Borrar stock
            </Button>
          ) : undefined
        }
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        disableEscapeKeyDown={deleteLoading}
      >
        <DialogTitle>Borrar stock</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            ¿Seguro que querés borrar este stock? Esta acción es irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteConfirm}
            disabled={deleteLoading}
            sx={{ textTransform: 'none' }}
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
            sx={{ textTransform: 'none' }}
          >
            {deleteLoading ? 'Borrando...' : 'Borrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarState.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarState.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default StockDialog;
