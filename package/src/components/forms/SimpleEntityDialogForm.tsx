'use client';

import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

type FieldConfig = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'datetime';
  required?: boolean;
  step?: number;
};

export type SimpleEntityDialogFormProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  fields: FieldConfig[];
  initialValues?: Record<string, any>;
};

const SimpleEntityDialogForm = ({
  open,
  title,
  onClose,
  onSubmit,
  fields,
  initialValues,
}: SimpleEntityDialogFormProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const resolvedInitialValues = React.useMemo(
    () => ({ ...(initialValues ?? {}) }),
    [initialValues]
  );

  const [values, setValues] = React.useState<Record<string, any>>(
    resolvedInitialValues
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setValues(resolvedInitialValues);
    setErrors({});
    setFormError(null);
  }, [resolvedInitialValues]);

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleCancel = React.useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validate = React.useCallback(() => {
    const validationErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = values[field.key];
      const isEmpty =
        value === undefined || value === null || String(value).trim() === '';

      if (field.required && isEmpty) {
        validationErrors[field.key] = 'Este campo es obligatorio';
      }
    });

    return validationErrors;
  }, [fields, values]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
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

  const renderField = (field: FieldConfig) => {
    const value = values[field.key] ?? '';
    const fieldError = errors[field.key];
    const commonProps = {
      fullWidth: true,
      label: field.label,
      required: field.required,
      value,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        const nextValue = event.target.value;
        setValues((prev) => ({
          ...prev,
          [field.key]: nextValue,
        }));
      },
      error: Boolean(fieldError),
      helperText: fieldError,
    };

    if (field.type === 'textarea') {
      return <TextField key={field.key} {...commonProps} multiline minRows={3} />;
    }

    if (field.type === 'number') {
      return (
        <TextField
          key={field.key}
          {...commonProps}
          type="number"
          inputProps={{
            step: field.step ?? 1,
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
          InputLabelProps={{ shrink: true }}
        />
      );
    }

    return <TextField key={field.key} {...commonProps} type="text" />;
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) {
          handleCancel();
        }
      }}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>{fields.map((field) => renderField(field))}</Stack>
          {formError && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mt: 2 }}
              data-testid="dialog-form-error"
            >
              {formError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress color="inherit" size={18} /> : null
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default SimpleEntityDialogForm;
