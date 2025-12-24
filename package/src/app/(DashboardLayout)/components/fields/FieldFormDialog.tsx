'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useRouter } from 'next/navigation';
import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from '@/components/forms/SimpleEntityDialogForm';
import type { FieldFormSubmitPayload } from '@/lib/fields/formTypes';

const generateClientId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `lot-${Math.random().toString(36).slice(2, 9)}`;

type FieldLotFormValue = {
  id?: number;
  clientId: string;
  code: string;
  areaHa: string;
};

type LotErrorState = Record<string, { code?: string; areaHa?: string }>;

const createLotFormValue = (
  overrides?: Partial<Omit<FieldLotFormValue, 'clientId'>>
): FieldLotFormValue => ({
  clientId: generateClientId(),
  id: overrides?.id,
  code: overrides?.code ?? '',
  areaHa:
    overrides?.areaHa !== undefined && overrides?.areaHa !== null
      ? String(overrides.areaHa)
      : '',
});

const DEFAULT_FORM_VALUES: FieldFormDialogValues = {
  name: '',
  totalAreaHa: '',
  location: '',
  isRented: false,
  notes: '',
  lots: [createLotFormValue()],
};

const FIELD_FORM_SECTIONS: SimpleEntityDialogSection[] = [
  {
    title: 'Datos del campo',
    fields: ['name', 'totalAreaHa', 'location'],
  },
  {
    title: 'Estado y notas',
    fields: ['isRented', 'notes'],
  },
  {
    title: 'Lotes asociados',
    fields: ['lots'],
  },
];

type FieldFormDialogValues = {
  name: string;
  totalAreaHa: string;
  location: string;
  isRented: boolean;
  notes: string;
  lots: FieldLotFormValue[];
};

export type FieldFormDialogMode = 'create' | 'edit';

export type FieldFormDialogInitialValues = Partial<{
  name: string;
  totalAreaHa: number | string | null;
  location: string;
  isRented: boolean;
  notes: string;
  lots: Array<{
    id?: number;
    code?: string;
    areaHa?: number | string | null;
  }>;
}>;

type FieldFormDialogProps = {
  open: boolean;
  mode: FieldFormDialogMode;
  onClose: () => void;
  initialValues?: FieldFormDialogInitialValues;
  fieldId?: number | null;
};

type CustomFieldRenderContext = Parameters<
  NonNullable<SimpleEntityDialogFieldConfig['renderValue']>
>[0];

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

const FieldFormDialog = ({
  open,
  mode,
  onClose,
  initialValues,
  fieldId,
}: FieldFormDialogProps) => {
  const router = useRouter();
  const [lotErrors, setLotErrors] = React.useState<LotErrorState>({});
  const lotsFieldErrorRef = React.useRef<(message?: string | null) => void>();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [sumWarningOpen, setSumWarningOpen] = React.useState(false);
  const pendingSubmitRef = React.useRef<FieldFormSubmitPayload | null>(null);

  React.useEffect(() => {
    if (!open) {
      setLotErrors({});
      lotsFieldErrorRef.current?.(undefined);
    }
  }, [open]);

  const resolvedInitialValues = React.useMemo<FieldFormDialogValues>(() => {
    const base: FieldFormDialogValues = {
      ...DEFAULT_FORM_VALUES,
      lots: DEFAULT_FORM_VALUES.lots.map((lot) => ({ ...lot })),
    };

    if (!initialValues) {
      return base;
    }

    if (initialValues.name !== undefined && initialValues.name !== null) {
      base.name = initialValues.name;
    }

    if (
      initialValues.totalAreaHa !== undefined &&
      initialValues.totalAreaHa !== null
    ) {
      base.totalAreaHa = String(initialValues.totalAreaHa);
    }

    if (initialValues.location !== undefined && initialValues.location !== null) {
      base.location = initialValues.location;
    }

    if (initialValues.isRented !== undefined && initialValues.isRented !== null) {
      base.isRented = Boolean(initialValues.isRented);
    }

    if (initialValues.notes !== undefined && initialValues.notes !== null) {
      base.notes = initialValues.notes;
    }

    if (Array.isArray(initialValues.lots) && initialValues.lots.length) {
      base.lots = initialValues.lots.map((lot) =>
        createLotFormValue({
          id: lot.id,
          code: lot.code ?? '',
          areaHa:
            lot.areaHa !== undefined && lot.areaHa !== null
              ? String(lot.areaHa)
              : '',
        })
      );
    }

    return base;
  }, [initialValues]);

  const renderIsRentedField = React.useCallback(
    ({ value, onChange }: CustomFieldRenderContext) => (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          px: 2,
          py: 1.5,
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            ¿Es un campo alquilado?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Activá para marcarlo como alquilado.
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={Boolean(value)}
              onChange={(event) => onChange(event.target.checked)}
            />
          }
          label={Boolean(value) ? 'Alquilado' : 'Propio'}
          sx={{ m: 0 }}
        />
      </Stack>
    ),
    []
  );

  const renderLotsField = React.useCallback(
    ({
      value,
      onChange,
      error,
      setError,
      setTouched,
    }: CustomFieldRenderContext) => {
      lotsFieldErrorRef.current = setError;
      const lots = Array.isArray(value)
        ? (value as FieldLotFormValue[])
        : [];

      const ensureTouched = () => {
        setTouched(true);
        setError(undefined);
      };

      const handleLotFieldChange = (
        clientId: string,
        key: 'code' | 'areaHa',
        nextValue: string
      ) => {
        ensureTouched();
        const nextLots = lots.map((lot) =>
          lot.clientId === clientId ? { ...lot, [key]: nextValue } : lot
        );
        onChange(nextLots);
        setLotErrors((prev) => {
          const existing = prev[clientId];
          if (!existing?.[key]) return prev;
          const next = { ...prev };
          const updatedRow = { ...existing };
          delete updatedRow[key];
          if (Object.keys(updatedRow).length === 0) {
            delete next[clientId];
          } else {
            next[clientId] = updatedRow;
          }
          return next;
        });
      };

      const handleRemoveLot = (clientId: string) => {
        ensureTouched();
        onChange(lots.filter((lot) => lot.clientId !== clientId));
        setLotErrors((prev) => {
          if (!prev[clientId]) return prev;
          const { [clientId]: _removed, ...rest } = prev;
          return rest;
        });
      };

      const handleAddLot = () => {
        ensureTouched();
        onChange([...lots, createLotFormValue()]);
      };

      return (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            Lotes asociados
          </Typography>
          {lots.length ? (
            <Table size="small" sx={{ borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Código / Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 180 }}>
                    Superficie (ha)
                  </TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>
                    &nbsp;
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map((lot) => {
                  const rowError = lotErrors[lot.clientId] ?? {};
                  return (
                    <TableRow key={lot.clientId}>
                      <TableCell>
                        <TextField
                          fullWidth
                          placeholder="Ej: Lote Norte"
                          value={lot.code}
                          onChange={(event) =>
                            handleLotFieldChange(
                              lot.clientId,
                              'code',
                              event.target.value
                            )
                          }
                          required
                          error={Boolean(rowError.code)}
                          helperText={rowError.code || ' '}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          type="number"
                          placeholder="Ej: 25"
                          value={lot.areaHa}
                          onChange={(event) =>
                            handleLotFieldChange(
                              lot.clientId,
                              'areaHa',
                              event.target.value
                            )
                          }
                          inputProps={{ step: 0.1, min: 0 }}
                          required
                          error={Boolean(rowError.areaHa)}
                          helperText={rowError.areaHa || ' '}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          aria-label="Eliminar lote"
                          onClick={() => handleRemoveLot(lot.clientId)}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Box
              sx={{
                border: (theme) => `1px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                px: 2,
                py: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Aún no agregaste lotes para este campo.
              </Typography>
            </Box>
          )}

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          <Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddLot}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Agregar lote
            </Button>
          </Box>
        </Stack>
      );
    },
    [lotErrors]
  );

  const formFields = React.useMemo<SimpleEntityDialogFieldConfig[]>(
    () => [
      {
        key: 'name',
        label: 'Nombre',
        type: 'text',
        required: true,
        placeholder: 'Ej: Campo La Esperanza',
      },
      {
        key: 'totalAreaHa',
        label: 'Superficie total (ha)',
        type: 'number',
        required: true,
        step: 0.1,
        helperText: 'Ingresá la superficie total del campo.',
      },
      {
        key: 'location',
        label: 'Ubicación',
        type: 'text',
        placeholder: 'Localidad, partido o coordenadas',
      },
      {
        key: 'isRented',
        label: 'Alquiler',
        type: 'readonly',
        renderValue: renderIsRentedField,
      },
      {
        key: 'notes',
        label: 'Notas',
        type: 'textarea',
        placeholder: 'Agregá información adicional del campo...',
      },
      {
        key: 'lots',
        label: 'Lotes',
        type: 'readonly',
        renderValue: renderLotsField,
      },
    ],
    [renderIsRentedField, renderLotsField]
  );

  const handleDialogSubmit = React.useCallback(
    async (formValues: Record<string, any>, skipAreaCheck = false) => {
      const values = formValues as FieldFormDialogValues;
      const nextLotErrors: LotErrorState = {};
      const normalizedLots: FieldFormSubmitPayload['lots'] = [];

      values.lots.forEach((lot, index) => {
        const clientId = lot.clientId || `tmp-${index}`;
        const trimmedCode = (lot.code ?? '').trim();
        const rawArea =
          typeof lot.areaHa === 'number' ? lot.areaHa : Number(lot.areaHa);
        const rowErrors: { code?: string; areaHa?: string } = {};

        if (!trimmedCode) {
          rowErrors.code = 'Ingresá un código válido';
        }

        if (!Number.isFinite(rawArea) || rawArea <= 0) {
          rowErrors.areaHa = 'Ingresá un número mayor a 0';
        }

        if (rowErrors.code || rowErrors.areaHa) {
          nextLotErrors[clientId] = rowErrors;
          return;
        }

        normalizedLots.push({
          id: lot.id,
          code: trimmedCode,
          areaHa: Number(rawArea),
        });
      });

      if (Object.keys(nextLotErrors).length) {
        setLotErrors(nextLotErrors);
        lotsFieldErrorRef.current?.(
          'Completá el código y la superficie de cada lote.'
        );
        throw new Error('Faltan datos obligatorios en los lotes');
      }

      setLotErrors({});
      lotsFieldErrorRef.current?.(undefined);

      const parsedArea = Number(values.totalAreaHa);
      if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
        throw new Error('Ingresá una superficie total válida');
      }

      const payload: FieldFormSubmitPayload = {
        name: values.name.trim(),
        totalAreaHa: parsedArea,
        location: values.location?.trim() ?? '',
        isRented: Boolean(values.isRented),
        notes: values.notes?.trim() ?? '',
        lots: normalizedLots,
      };

      if (!skipAreaCheck) {
        const lotsAreaSum = normalizedLots.reduce(
          (acc, lot) => acc + Number(lot.areaHa || 0),
          0
        );
        if (lotsAreaSum !== parsedArea) {
          pendingSubmitRef.current = payload;
          setSumWarningOpen(true);
          throw new Error(
            'Confirmá si querés guardar pese a la diferencia de superficie.'
          );
        }
      }

      if (mode === 'edit') {
        if (!fieldId || Number.isNaN(fieldId)) {
          throw new Error('No se encontró el campo a editar');
        }

        const response = await fetch(`/api/fields/${fieldId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payload }),
        });

        if (!response.ok) {
          const message = await parseErrorResponse(
            response,
            'No se pudo actualizar el campo'
          );
          throw new Error(message);
        }

        await response.json().catch(() => null);
        router.refresh();
        return;
      }

      const response = await fetch('/api/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(
          response,
          'No se pudo crear el campo'
        );
        throw new Error(message);
      }

      await response.json().catch(() => null);
      router.refresh();
    },
    [mode, router]
  );

  const dialogTitle =
    mode === 'create' ? 'Nuevo campo' : 'Editar información del campo';

  return (
    <>
      <SimpleEntityDialogForm
        open={open}
        title={dialogTitle}
        subtitle="Gestioná los datos del campo y sus lotes asociados."
        onClose={onClose}
        onSubmit={(values) => handleDialogSubmit(values)}
        fields={formFields}
        sections={FIELD_FORM_SECTIONS}
        initialValues={resolvedInitialValues}
        extraActions={
          mode === 'edit' && fieldId ? (
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                setDeleteError(null);
                setDeleteDialogOpen(true);
              }}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              Borrar campo
            </Button>
          ) : undefined
        }
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteDialogOpen(false);
          }
        }}
      >
        <DialogTitle>Borrar campo</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography>
              Esta acción eliminará el campo y todos sus lotes asociados.
              ¿Querés continuar?
            </Typography>
            {deleteError && (
              <Alert
                severity="error"
                onClose={() => setDeleteError(null)}
                sx={{ borderRadius: 2 }}
              >
                {deleteError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteLoading}
            onClick={async () => {
              if (!fieldId) {
                setDeleteError('No se encontró el campo a borrar');
                return;
              }

              try {
                setDeleteLoading(true);
                setDeleteError(null);

                const response = await fetch(`/api/fields/${fieldId}`, {
                  method: 'DELETE',
                });

                if (!response.ok) {
                  const message = await parseErrorResponse(
                    response,
                    'No se pudo borrar el campo'
                  );
                  throw new Error(message);
                }

                setDeleteDialogOpen(false);
                router.refresh();
                onClose();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Error desconocido al borrar el campo';
                setDeleteError(message);
              } finally {
                setDeleteLoading(false);
              }
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {deleteLoading ? 'Borrando...' : 'Borrar campo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={sumWarningOpen} onClose={() => setSumWarningOpen(false)}>
        <DialogTitle>Confirmar superficie</DialogTitle>
        <DialogContent dividers>
          <Typography>
            La suma de la superficie de los lotes no coincide con la superficie
            total del campo. ¿Seguro que deseas guardar?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setSumWarningOpen(false);
              pendingSubmitRef.current = null;
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const pending = pendingSubmitRef.current;
              if (!pending) {
                setSumWarningOpen(false);
                return;
              }
              setSumWarningOpen(false);
              pendingSubmitRef.current = null;
              void handleDialogSubmit(
                {
                  name: pending.name,
                  totalAreaHa: String(pending.totalAreaHa),
                  location: pending.location,
                  isRented: pending.isRented,
                  notes: pending.notes,
                  lots: pending.lots.map((lot) =>
                    createLotFormValue({
                      id: lot.id,
                      code: lot.code,
                      areaHa: lot.areaHa,
                    })
                  ),
                },
                true
              );
            }}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Guardar de todos modos
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FieldFormDialog;
