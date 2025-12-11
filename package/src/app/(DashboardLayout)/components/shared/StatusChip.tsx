'use client';

import * as React from 'react';
import { Chip, ChipProps } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/system';
import type { PaletteColor } from '@mui/material/styles/createPalette';

export type PaletteKey =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'error';

export interface StatusChipOption {
  /** Valor “crudo” del estado, el que viene de la BD o DTO */
  value: string;
  /** Label a mostrar en el chip (si no, usa el status tal cual) */
  label?: string;
  /** Color del theme a usar */
  color: PaletteKey | 'default';
}

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  status: string | null | undefined;
  options: StatusChipOption[];
  /**
   * Normaliza el valor antes de compararlo (por defecto: toLowerCase().trim()).
   * Lo dejo extensible por si tenés que hacer magia con acentos, etc.
   */
  normalize?: (value: string) => string;
  sx?: SxProps<Theme>;
}

const defaultNormalize = (value: string) => value.toLowerCase().trim();

const StatusChip: React.FC<StatusChipProps> = ({
  status,
  options,
  normalize = defaultNormalize,
  size = 'small',
  variant = 'outlined',
  sx,
  ...chipProps
}) => {
  const raw = status ?? '';
  const normalized = normalize(raw);

  const matched = options.find((opt) => normalize(opt.value) === normalized);

  const label = matched?.label ?? (status || '—');
  const paletteKey =
    matched?.color && matched.color !== 'default' ? matched.color : undefined;

  return (
    <Chip
      size={size}
      variant={variant}
      label={label}
      sx={(theme) => {
        // Estilo neutro (sin color de palette específico)
        if (!paletteKey) {
          return {
            fontWeight: 600,
            fontSize: '0.75rem',
            borderColor: theme.palette.divider,
            backgroundColor: theme.palette.grey[100],
            color: theme.palette.text.secondary,
            ...((typeof sx === 'function' ? sx(theme) : sx) as any),
          };
        }

        const palette = theme.palette[paletteKey] as PaletteColor;

        return {
          fontWeight: 600,
          fontSize: '0.75rem',
          backgroundColor: palette.light, // 👈 usamos LIGHT
          color: palette.dark,
          borderColor: palette.main,
          ...((typeof sx === 'function' ? sx(theme) : sx) as any),
        };
      }}
      {...chipProps}
    />
  );
};

export default StatusChip;
