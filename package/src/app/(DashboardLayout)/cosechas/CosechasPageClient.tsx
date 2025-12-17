'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import LandscapeIcon from '@mui/icons-material/Landscape';
import SpaIcon from '@mui/icons-material/Spa';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import CropChip from '@/app/(DashboardLayout)/components/shared/CropChip';
import SimpleEntityDialogForm, {
  SimpleEntityDialogFieldConfig,
  SimpleEntityDialogSection,
} from '@/components/forms/SimpleEntityDialogForm';
import type { HarvestDto } from '@/lib/baserow/harvests';

type CosechasPageClientProps = {
  initialHarvests: HarvestDto[];
};

/* --------- Helpers --------- */

const formatDateTimeParts = (
  value: string | null
): { date: string; time: string } => {
  if (!value) return { date: '—', time: '' };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value ?? '—', time: '' };

  return {
    date: date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }),
    time: date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

const formatKgs = (value: number): string =>
  (value || 0).toLocaleString('es-ES', {
    maximumFractionDigits: 0,
  });

const formatDateTimeLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const getDefaultHarvestFormValues = () => ({
  Fecha: formatDateTimeLocalInput(new Date()),
  'KG Cosechados': '',
  Campo: '',
  Lotes: [] as Array<string | number>,
  'Ciclo de siembra': '',
  Cultivo: '',
  Stock: '',
  'Viajes camión directos': '',
  Notas: '',
});

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
    return normalizedA.every(
      (value, index) => value === normalizedB[index]
    );
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

const normalizeHarvestFormToBaserowPayload = (
  formValues: Record<string, any>,
  options?: { includeEmptyOptional?: boolean }
) => {
  const includeEmptyOptional = options?.includeEmptyOptional ?? false;

  const rawDate = formValues['Fecha'];
  if (!rawDate) {
    throw new Error('La fecha es obligatoria');
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('La fecha ingresada no es válida');
  }

  const payload: Record<string, any> = {
    Fecha: parsedDate.toISOString(),
  };

  const rawKgs = formValues['KG Cosechados'];
  const harvestedKgs = parseFloat(rawKgs);
  if (Number.isNaN(harvestedKgs)) {
    throw new Error('Ingresá un número válido para los kilos cosechados');
  }
  payload['KG Cosechados'] = harvestedKgs;

  const lotsValue = Array.isArray(formValues.Lotes) ? formValues.Lotes : [];
  const lotIds = lotsValue
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));
  if (!lotIds.length) {
    throw new Error('Seleccioná al menos un lote');
  }
  payload.Lotes = lotIds;

  const cycleValue = formValues['Ciclo de siembra'];
  const cycleId = Number(cycleValue);
  if (!cycleId || Number.isNaN(cycleId)) {
    throw new Error('Seleccioná un ciclo de siembra válido');
  }
  payload['Ciclo de siembra'] = [cycleId];

  const stockValue = formValues.Stock;
  const stockId = Number(stockValue);
  if (stockValue && stockId && !Number.isNaN(stockId)) {
    payload.Stock = [stockId];
  } else if (includeEmptyOptional) {
    payload.Stock = [];
  }

  const tripValue = formValues['Viajes camión directos'];
  const tripId = Number(tripValue);
  if (tripValue && tripId && !Number.isNaN(tripId)) {
    payload['Viajes camión directos'] = [tripId];
  } else if (includeEmptyOptional) {
    payload['Viajes camión directos'] = [];
  }

  const notesValue = (formValues['Notas'] ?? '').trim();
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

  payload['KG Cosechados'] =
    typeof harvest.harvestedKgs === 'number' ? harvest.harvestedKgs : 0;

  payload.Lotes = Array.isArray(harvest.lotsIds)
    ? [...harvest.lotsIds]
    : [];

  const cycleId =
    typeof harvest.cycleId === 'number' && !Number.isNaN(harvest.cycleId)
      ? harvest.cycleId
      : null;

  payload['Ciclo de siembra'] = cycleId ? [cycleId] : [];

  const stockId =
    Array.isArray(harvest.stockIds) && harvest.stockIds.length
      ? harvest.stockIds[0]
      : null;
  payload.Stock =
    typeof stockId === 'number' && !Number.isNaN(stockId) ? [stockId] : [];

  const tripId =
    Array.isArray(harvest.directTruckTripIds) &&
    harvest.directTruckTripIds.length
      ? harvest.directTruckTripIds[0]
      : null;
  payload['Viajes camión directos'] =
    typeof tripId === 'number' && !Number.isNaN(tripId) ? [tripId] : [];

  const notesValue =
    typeof harvest.notes === 'string' ? harvest.notes.trim() : '';
  payload.Notas = notesValue;

  return payload;
};

const buildHarvestInitialValues = (harvest: HarvestDto) => {
  const harvestDate = harvest.date ? new Date(harvest.date) : null;
  const hasValidDate =
    !!harvestDate && !Number.isNaN(harvestDate.getTime());
  const harvestFieldId = (harvest as HarvestDto & { fieldId?: number | null })
    .fieldId;

  return {
    Fecha: hasValidDate
      ? formatDateTimeLocalInput(harvestDate)
      : formatDateTimeLocalInput(new Date()),
    'KG Cosechados': harvest.harvestedKgs ?? '',
    Campo: harvestFieldId ?? '',
    Lotes: harvest.lotsIds ?? [],
    'Ciclo de siembra': harvest.cycleId ?? '',
    Cultivo: harvest.crop ?? '',
    Stock: harvest.stockIds[0] ?? '',
    'Viajes camión directos': harvest.directTruckTripIds[0] ?? '',
    Notas: harvest.notes ?? '',
  };
};

type Option = {
  id: number;
  label: string;
};

type CycleOption = Option & {
  crop: string;
};

type FieldDependencies = {
  lots: Option[];
  cycles: CycleOption[];
  stocks: Option[];
  truckTrips: Option[];
};

const emptyDependencies: FieldDependencies = {
  lots: [],
  cycles: [],
  stocks: [],
  truckTrips: [],
};

/* --------- Component --------- */

const CosechasPageClient = ({ initialHarvests }: CosechasPageClientProps) => {
  const router = useRouter();
  const [periodFilter, setPeriodFilter] = React.useState<string>('all');
  const [fieldFilter, setFieldFilter] = React.useState<string>('all');
  const [cropFilter, setCropFilter] = React.useState<string>('all');
  const [cycleFilter, setCycleFilter] = React.useState<string>('all');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create'
  );
  const [activeHarvest, setActiveHarvest] = React.useState<HarvestDto | null>(
    null
  );
  const [snackbarState, setSnackbarState] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [dialogInitialValues, setDialogInitialValues] = React.useState(
    getDefaultHarvestFormValues
  );
  const [fieldOptions, setFieldOptions] = React.useState<Option[]>([]);
  const [fieldOptionsLoading, setFieldOptionsLoading] = React.useState(false);
  const [fieldOptionsError, setFieldOptionsError] = React.useState<
    string | null
  >(null);
  const [selectedField, setSelectedField] = React.useState<Option | null>(null);
  const [dependenciesCache, setDependenciesCache] = React.useState<
    Record<number, FieldDependencies>
  >({});
  const [dependenciesLoading, setDependenciesLoading] = React.useState(false);
  const [dependenciesError, setDependenciesError] = React.useState<
    string | null
  >(null);

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

  const currentDependencies = React.useMemo(() => {
    if (!selectedField) return emptyDependencies;
    return dependenciesCache[selectedField.id] ?? emptyDependencies;
  }, [dependenciesCache, selectedField]);

  const fetchFieldOptions = React.useCallback(async (): Promise<Option[]> => {
    let fields: Option[] = [];
    try {
      setFieldOptionsLoading(true);
      setFieldOptionsError(null);
      const response = await fetch('/api/harvests/options', {
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          errorBody || 'No se pudieron cargar los campos disponibles'
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
      setFieldOptionsError(message);
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
      if (dependenciesCache[field.id]) return;

      try {
        setDependenciesLoading(true);
        setDependenciesError(null);
        const params = new URLSearchParams({
          campoId: String(field.id),
        });
        if (field.label) {
          params.set('campoName', field.label);
        }
        const response = await fetch(`/api/harvests/options?${params}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            errorBody ||
              'No se pudieron cargar las opciones para el campo seleccionado'
          );
        }

        const data = (await response.json()) as {
          lots?: Option[];
          cycles?: CycleOption[];
          stocks?: Option[];
          truckTrips?: Option[];
        };
        setDependenciesCache((prev) => ({
          ...prev,
          [field.id]: {
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
            : 'Ocurrió un error al cargar las opciones dependientes';
        setDependenciesError(message);
        showToast(message, 'error');
      } finally {
        setDependenciesLoading(false);
      }
    },
    [dependenciesCache, showToast]
  );

  React.useEffect(() => {
    if (dialogOpen && !fieldOptions.length && !fieldOptionsLoading) {
      fetchFieldOptions();
    }
  }, [dialogOpen, fieldOptions.length, fieldOptionsLoading, fetchFieldOptions]);

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
        fieldOptions.find((option) => option.id === parsedValue) ?? null;
      setSelectedField(field);
      setDependenciesError(null);

      if (field) {
        fetchFieldDependencies(field);
      }
    },
    [fieldOptions, fetchFieldDependencies]
  );

  const openEditDialog = React.useCallback(
    async (harvest: HarvestDto) => {
      setDialogMode('edit');
      setActiveHarvest(harvest);
      setDependenciesError(null);
      setSelectedField(null);

      let availableFields = fieldOptions;
      if (!availableFields.length) {
        availableFields = await fetchFieldOptions();
      }

      const harvestInitialValues = buildHarvestInitialValues(harvest);

      const harvestFieldId = (harvest as HarvestDto & {
        fieldId?: number | null;
      }).fieldId;

      let matchedField: Option | null = null;

      if (harvestFieldId) {
        matchedField =
          availableFields.find((option) => option.id === harvestFieldId) ?? null;
      }

      if (!matchedField) {
        const harvestFieldLabel = harvest.field?.trim().toLowerCase() ?? '';
        if (harvestFieldLabel) {
          matchedField =
            availableFields.find(
              (option) =>
                option.label.trim().toLowerCase() === harvestFieldLabel
            ) ?? null;
        }
      }

      if (matchedField) {
        harvestInitialValues.Campo = matchedField.id;
      }

      setDialogInitialValues(harvestInitialValues);
      setSelectedField(matchedField);

      if (matchedField && !dependenciesCache[matchedField.id]) {
        await fetchFieldDependencies(matchedField);
      }

      setDialogOpen(true);
    },
    [dependenciesCache, fetchFieldDependencies, fetchFieldOptions, fieldOptions]
  );

  const handleOpenCreateDialog = React.useCallback(() => {
    setDialogMode('create');
    setActiveHarvest(null);
    setDialogInitialValues(getDefaultHarvestFormValues());
    setSelectedField(null);
    setDependenciesError(null);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode('create');
    setActiveHarvest(null);
    setSelectedField(null);
    setDependenciesError(null);
    setDialogInitialValues(getDefaultHarvestFormValues());
  }, []);

  const handleCreateStockShortcut = React.useCallback(() => {
    showToast('Crear stock desde aquí estará disponible pronto.', 'info');
  }, [showToast]);

  const handleAddTruckTripShortcut = React.useCallback(() => {
    showToast('Agregar viaje directo estará disponible pronto.', 'info');
  }, [showToast]);

  const harvestFormSections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: 'Información básica',
        description: 'Fecha y cantidad total cosechada',
        icon: <CalendarTodayIcon />,
        fields: ['Fecha', 'KG Cosechados'],
      },
      {
        title: 'Ubicación y origen',
        description: 'Campo, lotes y ciclo de donde proviene la cosecha',
        icon: <LandscapeIcon />,
        fields: ['Campo', 'Lotes', 'Ciclo de siembra', 'Cultivo'],
      },
      {
        title: 'Distribución',
        description: 'Stock y viajes directos asociados (opcional)',
        icon: <LocalShippingIcon />,
        fields: ['Stock', 'Viajes camión directos'],
      },
      {
        title: 'Notas adicionales',
        description: 'Observaciones y detalles extras',
        icon: <AgricultureIcon />,
        fields: ['Notas'],
      },
    ],
    []
  );

  const harvestFormFields = React.useMemo<
    SimpleEntityDialogFieldConfig[]
  >(() => {
    const campoOptions = fieldOptions.map((field) => ({
      label: field.label,
      value: field.id,
    }));

    const lotsOptions = currentDependencies.lots.map((lot) => ({
      label: lot.label,
      value: lot.id,
    }));

    const cycleOptions = currentDependencies.cycles.map((cycle) => ({
      label: cycle.label,
      value: cycle.id,
      meta: { crop: cycle.crop },
    }));

    const stockOptions = currentDependencies.stocks.map((stock) => ({
      label: stock.label,
      value: stock.id,
    }));

    const truckOptions = currentDependencies.truckTrips.map((trip) => ({
      label: trip.label,
      value: trip.id,
    }));

    const dependentHelperText = selectedField
      ? dependenciesError ?? undefined
      : 'Seleccioná un campo primero';

    const dependentDisabled = !selectedField || dependenciesLoading;

    return [
      {
        key: 'Fecha',
        label: 'Fecha y hora',
        type: 'datetime',
        required: true,
      },
      {
        key: 'KG Cosechados',
        label: 'Kilos cosechados',
        type: 'number',
        required: true,
        step: 0.01,
        placeholder: '0.00',
      },
      {
        key: 'Campo',
        label: 'Campo',
        type: 'select',
        required: true,
        options: campoOptions,
        loading: fieldOptionsLoading,
        onValueChange: () => ({
          Lotes: [],
          'Ciclo de siembra': '',
          Cultivo: '',
          Stock: '',
          'Viajes camión directos': '',
        }),
      },
      {
        key: 'Lotes',
        label: 'Lotes',
        type: 'multi-select',
        required: true,
        options: lotsOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText,
      },
      {
        key: 'Ciclo de siembra',
        label: 'Ciclo de siembra',
        type: 'select',
        required: true,
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
        helperText: 'Se completa automáticamente según el ciclo elegido',
      },
      {
        key: 'Stock',
        label: 'Stock',
        labelNode: (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Stock</span>
          </Box>
        ),
        type: 'select',
        options: stockOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText
          ? dependentHelperText
          : 'Opcional: asocia esta cosecha a un stock existente',
      },
      {
        key: 'Viajes camión directos',
        label: 'Viajes de camión',
        labelNode: (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Viajes de camión</span>
          </Box>
        ),
        type: 'select',
        options: truckOptions,
        loading: dependenciesLoading,
        disabled: dependentDisabled,
        helperText: dependentHelperText
          ? dependentHelperText
          : 'Opcional: viaje directo desde campo',
      },
      {
        key: 'Notas',
        label: 'Notas y observaciones',
        type: 'textarea',
        placeholder: 'Escribí aquí tus observaciones...',
      },
    ];
  }, [
    currentDependencies.cycles,
    currentDependencies.lots,
    currentDependencies.stocks,
    currentDependencies.truckTrips,
    dependenciesError,
    dependenciesLoading,
    fieldOptions,
    fieldOptionsError,
    fieldOptionsLoading,
    handleAddTruckTripShortcut,
    handleCreateStockShortcut,
    selectedField,
  ]);

  const uniquePeriods = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests
            .map((h) => (h.period ?? '').trim())
            .filter((p) => Boolean(p))
        )
      ).sort((a, b) => b.localeCompare(a)),
    [initialHarvests]
  );

  const uniqueCycles = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests
            .map((h) => h.cycleLabel?.trim() || '')
            .filter((v) => Boolean(v))
        )
      ).sort(),
    [initialHarvests]
  );

  const uniqueFields = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests.map((h) => h.field).filter((field) => Boolean(field))
        )
      ).sort(),
    [initialHarvests]
  );

  const uniqueCrops = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests.map((h) => h.crop).filter((crop) => Boolean(crop))
        )
      ).sort(),
    [initialHarvests]
  );

  const filteredHarvests = React.useMemo(() => {
    return initialHarvests.filter((harvest) => {
      const period = (harvest.period ?? '').trim();
      if (periodFilter !== 'all' && period !== periodFilter) return false;
      if (fieldFilter !== 'all' && harvest.field !== fieldFilter) return false;
      if (cropFilter !== 'all' && harvest.crop !== cropFilter) return false;
      if (cycleFilter !== 'all') {
        const cycleLabel = harvest.cycleLabel?.trim() || '';
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
        acc.totalHarvestedKgs += harvest.harvestedKgs;
        acc.totalDirectTruckKgs += harvest.directTruckKgs;
        acc.totalToStockKgs += harvest.stockKgs;
        acc.harvestCount += 1;
        return acc;
      },
      {
        totalHarvestedKgs: 0,
        totalDirectTruckKgs: 0,
        totalToStockKgs: 0,
        harvestCount: 0,
      }
    );
  }, [sortedHarvests]);

  const handleCreateSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      const payload = normalizeHarvestFormToBaserowPayload(formValues);
      const response = await fetch('/api/harvests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = 'No se pudo registrar la cosecha';
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error || errorBody;
          } catch {
            message = errorBody;
          }
        }
        showToast(message, 'error');
        throw new Error(message);
      }

      showToast('Cosecha registrada correctamente', 'success');
      router.refresh();
    },
    [router, showToast]
  );

  const handleEditSubmit = React.useCallback(
    async (formValues: Record<string, any>) => {
      if (!activeHarvest) {
        throw new Error('No se encontró la cosecha a editar');
      }

      const nextPayload = normalizeHarvestFormToBaserowPayload(formValues, {
        includeEmptyOptional: true,
      });
      const prevPayload = normalizeHarvestDtoToBaserowPayload(activeHarvest);
      const diffPayload = computeDiffPayload(prevPayload, nextPayload);

      if (!Object.keys(diffPayload).length) {
        showToast('No hay cambios para guardar', 'info');
        return;
      }

      const response = await fetch(`/api/harvests/${activeHarvest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload: diffPayload }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = 'No se pudo actualizar la cosecha';
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed?.error || errorBody;
          } catch {
            message = errorBody;
          }
        }
        showToast(message, 'error');
        throw new Error(message);
      }

      showToast('Cosecha actualizada correctamente', 'success');
      router.refresh();
    },
    [activeHarvest, router, showToast]
  );

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarState((prev) => ({ ...prev, open: false }));
  };

  const editHarvestIdentifier =
    activeHarvest?.harvestId || (activeHarvest ? `#${activeHarvest.id}` : null);
  const dialogTitle =
    dialogMode === 'create'
      ? 'Registrar nueva cosecha'
      : editHarvestIdentifier
        ? `Editar cosecha ${editHarvestIdentifier}`
        : 'Editar cosecha';
  const dialogSubmitHandler =
    dialogMode === 'create' ? handleCreateSubmit : handleEditSubmit;

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
              background: 'linear-gradient(135deg, #3A3184 0%, #6962A2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              mb: 1,
            }}
          >
            Cosechas
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '800px' }}
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
                  0.03
                )} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
              >
                <FormControl fullWidth size="small">
                  <TextField
                    label="Período"
                    select
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
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
                    sx={{ bgcolor: 'background.paper' }}
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
                    sx={{ bgcolor: 'background.paper' }}
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
                    sx={{ bgcolor: 'background.paper' }}
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
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
                marginBottom: '2rem',
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
                    0.12
                  )}`,
                })}
              >
                <Typography
                  variant="body2"
                  color="primary.dark"
                  fontWeight={600}
                >
                  {filteredHarvests.length} cosecha
                  {filteredHarvests.length === 1 ? '' : 's'} registrada
                  {filteredHarvests.length === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  width: { xs: '100%', md: 'auto' },
                  justifyContent: { xs: 'space-between', md: 'flex-end' },
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 3,
                    boxShadow: (theme) =>
                      `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                    '&:hover': {
                      boxShadow: (theme) =>
                        `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                    },
                  }}
                  onClick={handleOpenCreateDialog}
                >
                  Nueva cosecha
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Exportar CSV
                </Button>
              </Stack>
            </Stack>

            {/* Desktop table */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 2,
                  width: '100%',
                  overflowX: 'auto',
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.grey[500],
                    0.08
                  )}`,
                })}
              >
                <Table size="small">
                  <TableHead
                    sx={(theme) => ({
                      background: `linear-gradient(135deg, ${alpha(
                        theme.palette.primary.main,
                        0.06
                      )} 0%, ${alpha(theme.palette.primary.light, 0.06)} 100%)`,
                      '& .MuiTableCell-root': {
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                        borderBottom: `2px solid ${theme.palette.primary.main}`,
                        py: 1.5,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
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
                            0.15
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
                            0.15
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

                      return (
                        <TableRow
                          key={harvest.id}
                          hover
                          onClick={() => {
                            void openEditDialog(harvest);
                          }}
                          sx={(theme) => ({
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            bgcolor:
                              index % 2 === 0
                                ? 'transparent'
                                : alpha(theme.palette.grey[100], 0.4),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                              transform: 'scale(1.003)',
                              boxShadow: `0 2px 8px ${alpha(
                                theme.palette.primary.main,
                                0.1
                              )}`,
                            },
                            '& .MuiTableCell-root': {
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
                              {time || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {harvest.lotsIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {harvest.lotsIds.map((lid, i) => (
                                  <Chip
                                    key={lid}
                                    size="small"
                                    variant="outlined"
                                    label={
                                      harvest.lotsLabels[i] ?? `Lote ${lid}`
                                    }
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
                                0.08
                              )}`,
                            })}
                          />
                          <TableCell>
                            <Typography
                              component={Link}
                              href={`/ciclos/${harvest.cycleId}`}
                              onClick={(event) => event.stopPropagation()}
                              sx={(theme) => ({
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                              })}
                            >
                              {harvest.cycleLabel || `Ciclo ${harvest.cycleId}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {harvest.stockIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {harvest.stockIds.map((sid, i) => (
                                  <Chip
                                    key={sid}
                                    size="small"
                                    variant="outlined"
                                    label={`${harvest.stockLabels[i]}`}
                                    sx={{
                                      fontSize: 'body2',
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
                            {harvest.directTruckTripIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {harvest.directTruckTripIds.map((tid, i) => (
                                  <Chip
                                    key={tid}
                                    size="small"
                                    variant="outlined"
                                    label={`${harvest.directTruckLabels[i]}`}
                                    sx={{
                                      fontSize: 'body2',
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
                                0.08
                              )}`,
                            })}
                          />
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={700}>
                              {formatKgs(harvest.harvestedKgs)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {formatKgs(harvest.stockKgs)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {formatKgs(harvest.directTruckKgs)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow
                      sx={(theme) => ({
                        background: theme.palette.grey.A100,
                        '& .MuiTableCell-root': {
                          borderTop: `2px solid ${theme.palette.grey[300]}`,
                          fontWeight: 800,
                          color: theme.palette.primary.main,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          py: 1.5,
                          fontSize: '0.85rem',
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
                            0.08
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
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2}>
                <Card
                  sx={(theme) => ({
                    borderRadius: 2,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.2
                    )}`,
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.05
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
                          0.08
                        )}`,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 24px ${alpha(
                            theme.palette.primary.main,
                            0.15
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

                            {harvest.lotsIds.length ? (
                              <Stack
                                spacing={0.5}
                                flexWrap="wrap"
                                direction="row"
                              >
                                {harvest.lotsIds.map((lid, i) => (
                                  <Chip
                                    key={lid}
                                    size="small"
                                    variant="outlined"
                                    label={`${harvest.lotsLabels[i]}`}
                                    sx={{
                                      fontSize: 'body2',
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
                              height: '1px',
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
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
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
                                {formatKgs(harvest.harvestedKgs)} kg
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
                                {formatKgs(harvest.stockKgs)} kg
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
                                {formatKgs(harvest.directTruckKgs)} kg
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
        open={dialogOpen}
        title={dialogTitle}
        onClose={handleDialogClose}
        onSubmit={dialogSubmitHandler}
        fields={harvestFormFields}
        sections={harvestFormSections}
        initialValues={dialogInitialValues}
        onFieldChange={handleDialogFieldChange}
      />
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
    </PageContainer>
  );
};

export default CosechasPageClient;
