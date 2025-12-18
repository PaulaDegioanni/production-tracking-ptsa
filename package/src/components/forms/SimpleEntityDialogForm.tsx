'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import 'dayjs/locale/es';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayjs, { type Dayjs } from 'dayjs';
dayjs.extend(customParseFormat);
dayjs.locale('es');
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type DialogFieldOption = {
  label: string | React.ReactNode;
  value: string | number;
  disabled?: boolean;
  meta?: Record<string, any>;
};

export type SimpleEntityDialogFieldConfig = {
  key: string;
  label: string;
  labelNode?: React.ReactNode;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'datetime'
    | 'date'
    | 'time'
    | 'select'
    | 'multi-select'
    | 'readonly';
  required?: boolean;
  step?: number;
  options?: DialogFieldOption[];
  loading?: boolean;
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
  onValueChange?: (
    value: any,
    values: Record<string, any>
  ) => Record<string, any> | void;
  actionOptions?: Array<{
    key: string;
    label: string;
    onClick: (context: { values: Record<string, any> }) => void;
  }>;
  renderValue?: (context: {
    value: any;
    field: SimpleEntityDialogFieldConfig;
  }) => React.ReactNode;
};

export type SimpleEntityDialogSection = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  fields: string[];
};

export type SimpleEntityDialogFormProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  fields: SimpleEntityDialogFieldConfig[];
  initialValues?: Record<string, any>;
  sections?: SimpleEntityDialogSection[];
  onFieldChange?: (
    key: string,
    value: any,
    values: Record<string, any>
  ) => void;
  extraActions?: React.ReactNode;
  externalValues?: Record<string, any> | null;
  externalValuesKey?: string | number | null;
};

const cloneInitialValues = (initials?: Record<string, any>) => {
  if (!initials) return {};
  return Object.entries(initials).reduce<Record<string, any>>(
    (acc, [key, value]) => {
      acc[key] = Array.isArray(value)
        ? [...value]
        : value && typeof value === 'object'
        ? { ...value }
        : value;
      return acc;
    },
    {}
  );
};

const SimpleEntityDialogForm = ({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  fields,
  initialValues,
  sections,
  onFieldChange,
  extraActions,
  externalValues,
  externalValuesKey,
}: SimpleEntityDialogFormProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const resolvedInitialValues = React.useMemo(
    () => cloneInitialValues(initialValues),
    [initialValues]
  );

  const [values, setValues] = React.useState<Record<string, any>>(
    resolvedInitialValues
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const lastExternalValuesKey = React.useRef<string | number | null>(null);

  const resetForm = React.useCallback(() => {
    setValues(resolvedInitialValues);
    setErrors({});
    setFormError(null);
    setTouched({});
  }, [resolvedInitialValues]);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  React.useEffect(() => {
    if (
      !externalValues ||
      externalValuesKey === undefined ||
      externalValuesKey === null
    ) {
      return;
    }
    if (externalValuesKey === lastExternalValuesKey.current) return;
    lastExternalValuesKey.current = externalValuesKey;
    setValues((prev) => ({ ...prev, ...externalValues }));
    setErrors((prev) => {
      if (!Object.keys(externalValues).length) return prev;
      const next = { ...prev };
      Object.keys(externalValues).forEach((key) => {
        delete next[key];
      });
      return next;
    });
  }, [externalValues, externalValuesKey]);

  const handleCancel = React.useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validate = React.useCallback(() => {
    const validationErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (!field.required) return;
      const value = values[field.key];
      const isEmpty = Array.isArray(value)
        ? value.length === 0
        : value === undefined || value === null || String(value).trim() === '';

      if (isEmpty) {
        validationErrors[field.key] = 'Este campo es obligatorio';
      }
    });

    return validationErrors;
  }, [fields, values]);

  const handleFieldValueChange = React.useCallback(
    (field: SimpleEntityDialogFieldConfig, newValue: any) => {
      let mergedValues: Record<string, any> | null = null;

      setValues((prev) => {
        const next = { ...prev, [field.key]: newValue };
        const overrides = field.onValueChange?.(newValue, next);
        mergedValues = overrides ? { ...next, ...overrides } : next;
        return mergedValues;
      });

      setErrors((prev) => {
        if (!prev[field.key]) return prev;
        const { [field.key]: _removed, ...rest } = prev;
        return rest;
      });

      if (mergedValues) {
        onFieldChange?.(field.key, newValue, mergedValues);
      }
    },
    [onFieldChange]
  );

  const handleFieldBlur = (fieldKey: string) => {
    setTouched((prev) => ({ ...prev, [fieldKey]: true }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setTouched((prev) => {
        const next = { ...prev };
        Object.keys(validationErrors).forEach((k) => {
          next[k] = true;
        });
        return next;
      });
      return;
    }

    try {
      setLoading(true);
      setFormError(null);
      await onSubmit(values);
      resetForm();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al guardar los datos';
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  const resolvedSections = React.useMemo(() => {
    if (!sections || !sections.length) {
      return [
        {
          title: '',
          description: undefined,
          icon: undefined,
          fields,
        },
      ];
    }

    const usedKeys = new Set<string>();
    const mappedSections = sections
      .map((section) => {
        const sectionFields = section.fields
          .map((key) => {
            const field = fields.find((f) => f.key === key);
            if (field) usedKeys.add(field.key);
            return field;
          })
          .filter(Boolean) as SimpleEntityDialogFieldConfig[];

        return {
          title: section.title,
          description: section.description,
          icon: section.icon,
          fields: sectionFields,
        };
      })
      .filter((section) => section.fields.length > 0);

    const remainingFields = fields.filter((field) => !usedKeys.has(field.key));

    if (remainingFields.length) {
      mappedSections.push({
        title: '',
        description: undefined,
        icon: undefined,
        fields: remainingFields,
      });
    }

    return mappedSections;
  }, [fields, sections]);

  const summarizeMultiSelect = (
    selectedValues: Array<string | number>,
    options?: DialogFieldOption[],
    placeholder?: string
  ) => {
    if (!selectedValues.length) return placeholder || 'Seleccioná una opción';
    const labels = selectedValues
      .map((val) => options?.find((opt) => opt.value === val)?.label ?? val)
      .filter(Boolean)
      .map((label) => String(label));

    if (labels.length <= 2) return labels.join(', ');
    const remaining = labels.length - 2;
    return `${labels.slice(0, 2).join(', ')} +${remaining}`;
  };

  const renderSelectField = (
    field: SimpleEntityDialogFieldConfig,
    multiple: boolean
  ) => {
    const rawValue = values[field.key];
    const value = multiple
      ? Array.isArray(rawValue)
        ? rawValue
        : []
      : rawValue ?? '';
    const fieldError = errors[field.key];
    const isTouched = touched[field.key];
    const helper = fieldError || field.helperText || '';

    const selectedChips =
      multiple && Array.isArray(value)
        ? value.map((val) => ({
            value: val,
            label:
              field.options?.find((opt) => opt.value === val)?.label ??
              String(val),
          }))
        : [];

    const handleSelectChange = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const targetValue = event.target.value as unknown;

      if (
        !multiple &&
        typeof targetValue === 'string' &&
        targetValue.startsWith('__action__:')
      ) {
        const actionKey = targetValue.replace('__action__:', '');
        const action = field.actionOptions?.find(
          (opt) => opt.key === actionKey
        );
        if (action) {
          action.onClick({ values });
        }
        return;
      }

      let nextValue: any = targetValue;
      if (multiple) {
        nextValue = Array.isArray(targetValue)
          ? targetValue
          : typeof targetValue === 'string'
          ? targetValue.split(',').filter((v) => v !== '')
          : [];
      }
      handleFieldValueChange(field, nextValue);
    };

    return (
      <Box>
        <TextField
          key={field.key}
          select
          fullWidth
          label={field.labelNode ?? field.label}
          value={value}
          required={field.required}
          disabled={field.disabled || field.loading}
          error={Boolean(fieldError && isTouched)}
          helperText={helper}
          onChange={handleSelectChange}
          onBlur={() => handleFieldBlur(field.key)}
          SelectProps={{
            multiple,
            renderValue: multiple
              ? (selected) => {
                  const selectedValues = Array.isArray(selected)
                    ? selected
                    : [];
                  return summarizeMultiSelect(
                    selectedValues,
                    field.options,
                    field.placeholder
                  );
                }
              : undefined,
            displayEmpty: Boolean(field.placeholder),
          }}
          InputProps={{
            endAdornment: field.loading ? (
              <CircularProgress size={18} sx={{ mr: 1 }} />
            ) : undefined,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
              '&.Mui-focused': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
            },
            ...(multiple
              ? {
                  '& .MuiSelect-select': {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }
              : {}),
          }}
        >
          {!multiple && field.placeholder && (
            <MenuItem value="">{field.placeholder}</MenuItem>
          )}
          {field.options?.length ? (
            field.options.map((option) => (
              <MenuItem
                key={String(option.value)}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled value="">
              {field.loading
                ? 'Cargando opciones...'
                : 'Sin opciones disponibles'}
            </MenuItem>
          )}
          {field.actionOptions?.length ? (
            <>
              <Divider component="li" sx={{ my: 0.5 }} />
              {field.actionOptions.map((action) => (
                <MenuItem
                  key={`action-${action.key}`}
                  value={`__action__:${action.key}`}
                  sx={{
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    fontStyle: 'italic',
                  }}
                >
                  {action.label}
                </MenuItem>
              ))}
            </>
          ) : null}
        </TextField>
        {multiple && selectedChips.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mt: 1,
            }}
          >
            {selectedChips.map((chip) => (
              <Chip
                key={String(chip.value)}
                size="small"
                label={chip.label}
                sx={{
                  borderRadius: 1.5,
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderField = (field: SimpleEntityDialogFieldConfig) => {
    if (field.renderValue) {
      return (
        <Box key={field.key} sx={{ width: '100%' }}>
          {field.renderValue({ value: values[field.key], field })}
        </Box>
      );
    }

    if (field.type === 'select') {
      return renderSelectField(field, false);
    }

    if (field.type === 'multi-select') {
      return renderSelectField(field, true);
    }

    const value = values[field.key] ?? '';
    const fieldError = errors[field.key];
    const isTouched = touched[field.key];
    const helper = fieldError || field.helperText || '';

    const commonProps = {
      fullWidth: true,
      label: field.labelNode ?? field.label,
      required: field.required,
      value,
      disabled: field.disabled,
      error: Boolean(fieldError && isTouched),
      helperText: helper,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        const nextValue = event.target.value;
        handleFieldValueChange(field, nextValue);
      },
      onBlur: () => handleFieldBlur(field.key),
      sx: {
        '& .MuiOutlinedInput-root': {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          },
          '&.Mui-focused': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          },
        },
      },
    };

    if (field.type === 'textarea') {
      return (
        <TextField key={field.key} {...commonProps} multiline minRows={3} />
      );
    }

    if (field.type === 'number') {
      return (
        <TextField
          key={field.key}
          {...commonProps}
          type="number"
          slotProps={{
            htmlInput: {
              step: field.step ?? 1,
            },
          }}
        />
      );
    }

    if (field.type === 'datetime') {
      return (
        <TextField
          key={field.key}
          {...commonProps}
          type="datetime-local"
          slotProps={{
            inputLabel: { shrink: true },
          }}
        />
      );
    }

    if (field.type === 'date') {
      const {
        value: _ignoreValue,
        onChange: _ignoreOnChange,
        ...textFieldProps
      } = commonProps;
      const raw = (values[field.key] ?? '') as string;
      const pickerValue = raw ? dayjs(raw, 'YYYY-MM-DD', true) : null;

      return (
        <DatePicker
          key={field.key}
          label={field.labelNode ?? field.label}
          format="DD-MM-YYYY"
          value={pickerValue && pickerValue.isValid() ? pickerValue : null}
          onChange={(newVal: Dayjs | null) => {
            const next =
              newVal && newVal.isValid() ? newVal.format('YYYY-MM-DD') : '';
            handleFieldValueChange(field, next);
          }}
          slotProps={{
            textField: {
              ...textFieldProps,
            },
          }}
        />
      );
    }

    if (field.type === 'time') {
      const {
        value: _ignoreValue,
        onChange: _ignoreOnChange,
        ...textFieldProps
      } = commonProps;
      const raw = (values[field.key] ?? '') as string;
      const pickerValue = raw ? dayjs(raw, 'HH:mm', true) : null;

      return (
        <TimePicker
          key={field.key}
          label={field.labelNode ?? field.label}
          value={pickerValue && pickerValue.isValid() ? pickerValue : null}
          onChange={(newVal: Dayjs | null) => {
            const next =
              newVal && newVal.isValid() ? newVal.format('HH:mm') : '';
            handleFieldValueChange(field, next);
          }}
          ampm={false}
          format="HH:mm"
          slotProps={{
            textField: {
              ...textFieldProps,
            },
          }}
        />
      );
    }

    if (field.type === 'readonly') {
      return (
        <TextField
          key={field.key}
          {...commonProps}
          slotProps={{
            input: { readOnly: true },
          }}
          sx={{
            ...commonProps.sx,
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.grey[500], 0.05),
            },
          }}
        />
      );
    }

    return <TextField key={field.key} {...commonProps} type="text" />;
  };

const chunkFields = (
  sectionFields: SimpleEntityDialogFieldConfig[],
  sectionIndex: number
): SimpleEntityDialogFieldConfig[][] => {
  if (sectionIndex === 0) {
    const firstRow = sectionFields.slice(0, 3);
    const rest = sectionFields.slice(3);
    const rowList: SimpleEntityDialogFieldConfig[][] = [];
    if (firstRow.length) {
      rowList.push(firstRow);
    }
    for (let i = 0; i < rest.length; i += 2) {
      rowList.push(rest.slice(i, i + 2));
    }
    return rowList;
  }

  if (sectionIndex === 1) {
    const firstGroup = sectionFields.slice(0, 3);
    const rest = sectionFields.slice(3);
    const rows: SimpleEntityDialogFieldConfig[][] = [];
    if (firstGroup.length) {
      rows.push(firstGroup);
    }
    for (let i = 0; i < rest.length; i += 2) {
      rows.push(rest.slice(i, i + 2));
    }
    return rows;
  }

  const rows: SimpleEntityDialogFieldConfig[][] = [];
  for (let i = 0; i < sectionFields.length; i += 2) {
    rows.push(sectionFields.slice(i, i + 2));
  }
  return rows;
};

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Dialog
        open={open}
        onClose={() => {
          if (!loading) {
            handleCancel();
          }
        }}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, md: 3 },
            overflow: 'hidden',
          },
        }}
      >
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.08
              )} 0%, ${alpha(theme.palette.primary.light, 0.08)} 100%)`,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 2,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              <IconButton
                onClick={handleCancel}
                disabled={loading}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent
            dividers
            sx={{
              px: { xs: 2, md: 3 },
              py: 3,
              backgroundColor: alpha(theme.palette.grey[50], 0.3),
              maxHeight: {
                xs: 'calc(100vh - 170px)',
                md: '70vh',
              },
              overflowY: 'auto',
            }}
          >
            <Stack spacing={4}>
              {resolvedSections.map((section, sectionIndex) => {
                if (!section.fields.length) return null;
                const rows = chunkFields(section.fields, sectionIndex);
                const showMeta = Boolean(
                  section.title || section.description || section.icon
                );

                return (
                  <Paper key={`${section.title}-${sectionIndex}`} elevation={0}>
                    {showMeta && (
                      <Box mb={3}>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          {section.title && (
                            <Typography variant="h6" color="text.primary">
                              {section.title}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}

                    <Stack spacing={2.5}>
                      {rows.map((row, rowIndex) => {
                        const isFirstSectionFirstRow =
                          sectionIndex === 0 && rowIndex === 0;
                        const isOriginFirstRow =
                          sectionIndex === 1 && rowIndex === 0;

                        if (isFirstSectionFirstRow) {
                          const areaMap: Record<string, string> = {
                            Fecha_fecha: 'fecha',
                            Fecha_hora: 'hora',
                            'KG Cosechados': 'kgs',
                          };
                          return (
                            <Box
                              key={
                                row.map((field) => field.key).join('-') ||
                                `row-${rowIndex}`
                              }
                              sx={{
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns: {
                                  xs: 'repeat(2, minmax(0, 1fr))',
                                  md: 'repeat(3, minmax(0, 1fr))',
                                },
                                gridTemplateAreas: {
                                  xs: '"fecha hora" "kgs kgs"',
                                  md: '"fecha hora kgs"',
                                },
                              }}
                            >
                              {row.map((field) => (
                                <Box
                                  key={field.key}
                                  sx={{
                                    minWidth: 0,
                                    gridArea: areaMap[field.key] ?? 'auto',
                                  }}
                                >
                                  {renderField(field)}
                                </Box>
                              ))}
                            </Box>
                          );
                        }

                        if (isOriginFirstRow) {
                          const isTruckOriginRow = row.some(
                            (field) => field.key === 'Campo origen'
                          );
                          const areaMap: Record<string, string> = isTruckOriginRow
                            ? {
                                'Campo origen': 'campo',
                                'Tipo origen': 'tipo',
                                Origen: 'origen',
                              }
                            : {
                                Campo: 'campo',
                                'Ciclo de siembra': 'ciclo',
                                Cultivo: 'cultivo',
                              };
                          const gridTemplateColumns = isTruckOriginRow
                            ? {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                md: '1.2fr 0.8fr 1.9fr',
                              }
                            : {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                md: '1.1fr 1.8fr 0.9fr',
                              };
                          const gridTemplateAreas = isTruckOriginRow
                            ? {
                                xs: '"campo campo" "tipo origen"',
                                md: '"campo tipo origen"',
                              }
                            : {
                                xs: '"campo campo" "ciclo cultivo"',
                                md: '"campo ciclo cultivo"',
                              };
                          return (
                            <Box
                              key={
                                row.map((field) => field.key).join('-') ||
                                `row-${rowIndex}`
                              }
                              sx={{
                                display: 'grid',
                                gap: 2,
                                gridTemplateColumns,
                                gridTemplateAreas,
                              }}
                            >
                              {row.map((field) => (
                                <Box
                                  key={field.key}
                                  sx={{
                                    minWidth: 0,
                                    gridArea: areaMap[field.key] ?? 'auto',
                                  }}
                                >
                                  {renderField(field)}
                                </Box>
                              ))}
                            </Box>
                          );
                        }

                        return (
                          <Stack
                            key={
                              row.map((field) => field.key).join('-') ||
                              rowIndex
                            }
                            direction={{
                              xs: 'column',
                              sm: row.length > 1 ? 'row' : 'column',
                            }}
                            spacing={2}
                          >
                            {row.map((field) => (
                              <Box
                                key={field.key}
                                sx={{ flex: 1, minWidth: 0 }}
                              >
                                {renderField(field)}
                              </Box>
                            ))}
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            <Collapse in={Boolean(formError)}>
              <Alert
                severity="error"
                icon={<ErrorOutlineIcon />}
                sx={{
                  mt: 3,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    width: '100%',
                  },
                }}
                onClose={() => setFormError(null)}
              >
                <Typography variant="body2" fontWeight={600}>
                  {formError}
                </Typography>
              </Alert>
            </Collapse>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2.5,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.grey[50],
                0.5
              )} 0%, ${alpha(theme.palette.grey[100], 0.5)} 100%)`,
              borderTop: `1px solid ${theme.palette.divider}`,
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            {extraActions ? (
              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  minWidth: { xs: '100%', sm: 'auto' },
                  mb: { xs: 1.5, sm: 0 },
                }}
              >
                {extraActions}
              </Box>
            ) : null}
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress color="inherit" size={18} />
                ) : (
                  <CheckCircleOutlineIcon />
                )
              }
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                boxShadow: `0 4px 12px ${alpha(
                  theme.palette.primary.main,
                  0.3
                )}`,
                '&:hover': {
                  boxShadow: `0 6px 16px ${alpha(
                    theme.palette.primary.main,
                    0.4
                  )}`,
                },
              }}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
};

export default SimpleEntityDialogForm;
