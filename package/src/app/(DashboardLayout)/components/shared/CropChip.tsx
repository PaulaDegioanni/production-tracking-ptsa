'use client';

import * as React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { alpha } from '@mui/material/styles';

export interface CropChipProps extends Omit<ChipProps, 'label'> {
  crop: string;
}

/**
 * Color base por cultivo.
 * Podés ajustar estos hex cuando quieras y toda la UI se actualiza.
 */
export const getCropBaseColor = (crop: string): string => {
  const c = (crop || '').toLowerCase();

  if (c.includes('soja')) return '#bf73ee';
  if (c.includes('maíz') || c.includes('maiz')) return '#2f97a5';
  if (c.includes('trigo')) return '#86b300';

  return '#5A6A85'; // default
};

const CropChip: React.FC<CropChipProps> = ({
  crop,
  size = 'small',
  variant = 'outlined',
  sx,
  ...chipProps
}) => {
  const label = crop || 'Sin cultivo';

  return (
    <Chip
      size={size}
      variant={variant}
      label={label}
      sx={(theme) => {
        const base = getCropBaseColor(crop);
        return {
          bgcolor: alpha(base, 0.12),
          border: `1.5px solid ${alpha(base, 0.2)}`,
          color: base,
          fontWeight: 700,
          fontSize: theme.typography.caption.fontSize,
          height: 22,
          ...((typeof sx === 'function' ? sx(theme) : sx) as any),
        };
      }}
      {...chipProps}
    />
  );
};

export default CropChip;
