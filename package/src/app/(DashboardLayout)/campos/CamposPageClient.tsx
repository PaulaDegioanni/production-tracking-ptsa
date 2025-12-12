'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Link from 'next/link';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import StatusChip, {
  StatusChipOption,
} from '@/app/(DashboardLayout)/components/shared/StatusChip';
import CropChip from '@/app/(DashboardLayout)/components/shared/CropChip';
import type { FieldDto } from '@/lib/baserow/fields';
import type { LotDto } from '@/lib/baserow/lots';
import type { CycleDto } from '@/lib/baserow/cycles';

type CamposPageClientProps = {
  fields: FieldDto[];
  lots: LotDto[];
  cycles: CycleDto[];
};

type LotWithCycle = {
  lot: LotDto;
  currentCycle: CycleDto | null;
};

type FieldWithLots = {
  field: FieldDto;
  lotsWithCycle: LotWithCycle[];
  activeAreaHa: number;
  hasActiveCycle: boolean;
};

type CropProductionSummary = {
  crop: string;
  totalKgs: number;
  avgYield: number | null;
};

const CYCLE_STATUS_OPTIONS: StatusChipOption[] = [
  { value: 'planificado', label: 'Planificado', color: 'default' },
  { value: 'barbecho', label: 'Barbecho', color: 'warning' },
  { value: 'sembrado', label: 'Sembrado', color: 'info' },
  {
    value: 'listo-para-cosechar',
    label: 'Listo para cosechar',
    color: 'warning',
  },
  { value: 'en-cosecha', label: 'En cosecha', color: 'primary' },
  { value: 'cosechado', label: 'Cosechado', color: 'success' },
];

const formatArea = (value: number) =>
  value.toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatKgs = (value: number) =>
  value.toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });

const normalizePeriod = (period: string) => period?.trim();

const getPeriodYears = (period: string) => {
  const clean = normalizePeriod(period);
  if (!clean) return { start: 0, end: 0 };
  const match = clean.match(/(\d{4})\/(\d{4})/);
  if (!match) return { start: 0, end: 0 };
  return {
    start: Number(match[1]),
    end: Number(match[2]),
  };
};

const timestampValue = (value?: string | null) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Number.NEGATIVE_INFINITY : ts;
};

const extractYear = (value?: string | null): number | null => {
  if (!value) return null;
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return date.getFullYear();
};

const ACTIVE_CYCLE_STATUSES = new Set<CycleDto['status']>([
  'barbecho',
  'sembrado',
  'listo-para-cosechar',
  'en-cosecha',
]);

const buildProductionSummary = (
  fieldData?: FieldWithLots | null
): CropProductionSummary[] => {
  if (!fieldData) return [];

  // Dedupe cycles (same cycle can appear in multiple lotsWithCycle)
  const uniqueCycles = new Map<number, CycleDto>();
  fieldData.lotsWithCycle.forEach(({ currentCycle }) => {
    if (currentCycle) uniqueCycles.set(currentCycle.id, currentCycle);
  });

  const totalsKgs = new Map<string, number>();
  const yieldSum = new Map<string, number>();
  const yieldCount = new Map<string, number>();

  uniqueCycles.forEach((cycle) => {
    const cropName = cycle.crop || 'Sin cultivo';

    totalsKgs.set(
      cropName,
      (totalsKgs.get(cropName) ?? 0) + (cycle.totalKgs || 0)
    );

    const y = cycle.actualYield;
    if (typeof y === 'number' && y > 0) {
      yieldSum.set(cropName, (yieldSum.get(cropName) ?? 0) + y);
      yieldCount.set(cropName, (yieldCount.get(cropName) ?? 0) + 1);
    }
  });

  return Array.from(totalsKgs.entries())
    .map(([crop, totalKgs]) => {
      const sum = yieldSum.get(crop) ?? 0;
      const count = yieldCount.get(crop) ?? 0;
      return {
        crop,
        totalKgs,
        avgYield: count ? sum / count : null,
      };
    })
    .sort((a, b) => b.totalKgs - a.totalKgs);
};

const CamposPageClient: React.FC<CamposPageClientProps> = ({
  fields,
  lots,
  cycles,
}) => {
  const { periodOptions, defaultPeriod } = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        cycles
          .map((cycle) => normalizePeriod(cycle.period))
          .filter((period): period is string => Boolean(period))
      )
    );

    const sorted = unique.sort((a, b) => {
      const yearsA = getPeriodYears(a);
      const yearsB = getPeriodYears(b);

      if (yearsA.end !== yearsB.end) {
        return yearsB.end - yearsA.end;
      }

      if (yearsA.start !== yearsB.start) {
        return yearsB.start - yearsA.start;
      }

      return b.localeCompare(a);
    });

    const currentYear = new Date().getFullYear();
    const preferentialPeriods = new Set<string>();

    cycles.forEach((cycle) => {
      const period = normalizePeriod(cycle.period);
      if (!period) return;
      const fallowYear = extractYear(cycle.fallowStartDate);
      if (fallowYear === currentYear) {
        preferentialPeriods.add(period);
      }
    });

    const prioritized =
      sorted.find((period) => preferentialPeriods.has(period)) ??
      sorted[0] ??
      '';

    return {
      periodOptions: sorted,
      defaultPeriod: prioritized,
    };
  }, [cycles]);

  const [selectedPeriod, setSelectedPeriod] =
    React.useState<string>(defaultPeriod);

  React.useEffect(() => {
    setSelectedPeriod((current) => {
      if (!periodOptions.length) return '';
      if (current && periodOptions.includes(current)) {
        return current;
      }
      return defaultPeriod;
    });
  }, [periodOptions, defaultPeriod]);

  const handleChangePeriod = (event: SelectChangeEvent<string>) => {
    setSelectedPeriod(event.target.value);
  };

  const handleFieldActivityFilterChange = (
    event: SelectChangeEvent<string>
  ) => {
    const value = event.target.value as 'all' | 'active' | 'inactive';
    setFieldActivityFilter(value);
  };

  const renderFieldLocationLink = React.useCallback((location?: string) => {
    const normalized = (location ?? '').trim();

    if (!normalized) {
      return (
        <Typography
          sx={(theme) => ({
            fontSize: {
              xs: theme.typography.body2.fontSize,
            },
          })}
          color="text.secondary"
        >
          Sin ubicación
        </Typography>
      );
    }

    const hasProtocol = /^https?:\/\//i.test(normalized);
    const href = hasProtocol ? normalized : `https://${normalized}`;

    return (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: theme.palette.primary.main,
          textDecoration: 'none',
          fontWeight: 600,
          '&:hover': {
            textDecoration: 'underline',
          },
        })}
      >
        <Typography
          sx={(theme) => ({
            fontSize: {
              xs: theme.typography.body2.fontSize,
            },
          })}
          component="span"
        >
          Ver ubicación
        </Typography>
        <OpenInNewIcon sx={{ fontSize: 12 }} />
      </Box>
    );
  }, []);

  const getCurrentCycleForLot = React.useCallback(
    (lotId: number): CycleDto | null => {
      if (!selectedPeriod) return null;

      const candidates = cycles.filter(
        (cycle) =>
          cycle.period === selectedPeriod && cycle.lotIds.includes(lotId)
      );

      if (!candidates.length) return null;

      return candidates
        .slice()
        .sort((a, b) => {
          // Latest agronomic activity wins (fallow → sowing → id).
          const fallowDiff =
            timestampValue(b.fallowStartDate) -
            timestampValue(a.fallowStartDate);
          if (fallowDiff !== 0) return fallowDiff;

          const sowingDiff =
            timestampValue(b.sowingDate) - timestampValue(a.sowingDate);
          if (sowingDiff !== 0) return sowingDiff;

          return b.id - a.id;
        })
        .at(0)!;
    },
    [cycles, selectedPeriod]
  );

  const lotsById = React.useMemo(() => {
    const map = new Map<number, LotDto>();
    lots.forEach((lot) => {
      map.set(lot.id, lot);
    });
    return map;
  }, [lots]);

  const lotsByFieldName = React.useMemo(() => {
    const map = new Map<string, LotDto[]>();
    lots.forEach((lot) => {
      const key = lot.fieldName.trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(lot);
    });
    return map;
  }, [lots]);

  const fieldsWithLots = React.useMemo<FieldWithLots[]>(() => {
    return fields.map((field) => {
      const lotIdSet = new Set(field.lotIds);
      const linkedLots = field.lotIds
        .map((lotId) => lotsById.get(lotId))
        .filter((lot): lot is LotDto => Boolean(lot));

      const fallbackKey = field.name.trim().toLowerCase();
      const fallbackLots = fallbackKey
        ? (lotsByFieldName.get(fallbackKey) ?? []).filter(
            (lot) => !lotIdSet.has(lot.id)
          )
        : [];

      const combinedLots = [...linkedLots, ...fallbackLots];

      const lotsWithCycle = combinedLots.map((lot) => ({
        lot,
        currentCycle: getCurrentCycleForLot(lot.id),
      }));

      const activeAreaHa = lotsWithCycle.reduce((acc, item) => {
        if (!item.lot.isActive || !item.currentCycle) return acc;
        return acc + item.lot.areaHa;
      }, 0);

      const hasActiveCycle = lotsWithCycle.some(({ lot, currentCycle }) => {
        if (!lot.isActive) return false;
        if (!currentCycle) return false;
        return ACTIVE_CYCLE_STATUSES.has(currentCycle.status);
      });

      return {
        field,
        lotsWithCycle,
        activeAreaHa,
        hasActiveCycle,
      };
    });
  }, [fields, lotsById, lotsByFieldName, getCurrentCycleForLot]);

  const sortedFields = React.useMemo(() => {
    return [...fieldsWithLots].sort((a, b) => {
      if (a.hasActiveCycle !== b.hasActiveCycle) {
        return a.hasActiveCycle ? -1 : 1;
      }
      return a.field.name.localeCompare(b.field.name, undefined, {
        sensitivity: 'base',
      });
    });
  }, [fieldsWithLots]);

  const [selectedFieldId, setSelectedFieldId] = React.useState<number | null>(
    () => sortedFields[0]?.field.id ?? null
  );
  const [expandedFieldId, setExpandedFieldId] = React.useState<number | null>(
    () => sortedFields[0]?.field.id ?? null
  );
  const [fieldActivityFilter, setFieldActivityFilter] = React.useState<
    'all' | 'active' | 'inactive'
  >('all');

  React.useEffect(() => {
    if (!sortedFields.length) {
      setSelectedFieldId(null);
      setExpandedFieldId(null);
      return;
    }

    setSelectedFieldId((current) => {
      if (current && sortedFields.some((item) => item.field.id === current)) {
        return current;
      }
      return sortedFields[0].field.id;
    });

    setExpandedFieldId((current) => {
      if (current === null) return current;
      if (sortedFields.some((item) => item.field.id === current)) {
        return current;
      }
      return sortedFields[0].field.id;
    });
  }, [sortedFields]);

  const filteredFields = React.useMemo(() => {
    if (fieldActivityFilter === 'all') return sortedFields;
    const shouldBeActive = fieldActivityFilter === 'active';
    return sortedFields.filter(
      (item) => item.hasActiveCycle === shouldBeActive
    );
  }, [sortedFields, fieldActivityFilter]);

  React.useEffect(() => {
    if (!filteredFields.length) {
      setSelectedFieldId(null);
      setExpandedFieldId(null);
      return;
    }

    setSelectedFieldId((current) => {
      if (current && filteredFields.some((item) => item.field.id === current)) {
        return current;
      }
      return filteredFields[0].field.id;
    });

    setExpandedFieldId((current) => {
      if (
        current !== null &&
        filteredFields.some((item) => item.field.id === current)
      ) {
        return current;
      }
      return filteredFields[0].field.id;
    });
  }, [filteredFields]);

  const selectedField = React.useMemo(
    () =>
      selectedFieldId
        ? filteredFields.find((item) => item.field.id === selectedFieldId) ??
          null
        : null,
    [filteredFields, selectedFieldId]
  );

  const selectedFieldProduction = React.useMemo(
    () => buildProductionSummary(selectedField),
    [selectedField]
  );

  const lotsWithCurrentCycle = selectedField?.lotsWithCycle ?? [];
  const lotsWithActiveCycle = lotsWithCurrentCycle.filter((item) =>
    Boolean(item.currentCycle)
  );

  const selectedFieldActiveArea = selectedField?.activeAreaHa ?? 0;

  const handleSelectField = React.useCallback((fieldId: number) => {
    setSelectedFieldId(fieldId);
  }, []);

  const toggleFieldExpansion = React.useCallback((fieldId: number) => {
    setExpandedFieldId((current) => (current === fieldId ? null : fieldId));
  }, []);

  return (
    <PageContainer
      title="Campos & Lotes"
      description="Visualiza la estructura física de los campos y cómo se están utilizando por campaña."
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
            Campos & Lotes
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 720 }}
          >
            Explora cada campo, su superficie y los lotes activos según la
            campaña seleccionada para entender dónde se distribuyen los ciclos.
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
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!periodOptions.length}
                >
                  <InputLabel id="period-filter-label">Período</InputLabel>
                  <Select
                    labelId="period-filter-label"
                    label="Período"
                    value={selectedPeriod}
                    onChange={handleChangePeriod}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    {!periodOptions.length && (
                      <MenuItem value="" disabled>
                        Sin campañas disponibles
                      </MenuItem>
                    )}
                    {periodOptions.map((period) => (
                      <MenuItem key={period} value={period}>
                        {period}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="field-activity-filter-label">
                    Actividad
                  </InputLabel>
                  <Select
                    labelId="field-activity-filter-label"
                    label="Actividad"
                    value={fieldActivityFilter}
                    onChange={handleFieldActivityFilterChange}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos los campos</MenuItem>
                    <MenuItem value="active">Solo activos</MenuItem>
                    <MenuItem value="inactive">Sin actividad</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Typography variant="h5" fontWeight={700}>
              {selectedPeriod ? `Campaña ${selectedPeriod}` : 'Campos y lotes'}
            </Typography>

            <Stack
              direction="row"
              spacing={3}
              sx={{ display: { xs: 'none', md: 'flex' } }}
              alignItems="stretch"
            >
              <Box
                sx={(theme) => ({
                  flexBasis: '33%',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: alpha(theme.palette.background.paper, 0.9),
                  p: 2,
                  maxHeight: 640,
                  overflowY: 'auto',
                })}
              >
                <Stack spacing={1.5}>
                  {filteredFields.length === 0 && (
                    <Box
                      sx={{
                        py: 6,
                        textAlign: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      No hay campos para los filtros seleccionados.
                    </Box>
                  )}
                  {filteredFields.map(
                    ({ field, activeAreaHa, hasActiveCycle }) => {
                      const isSelected = selectedFieldId === field.id;
                      const statusChip = hasActiveCycle
                        ? {
                            label: 'Activo',
                            color: 'success' as const,
                            variant: 'filled' as const,
                          }
                        : {
                            label: 'Sin actividad',
                            color: 'default' as const,
                            variant: 'filled' as const,
                          };
                      return (
                        <Box
                          key={field.id}
                          onClick={() => handleSelectField(field.id)}
                          sx={(theme) => ({
                            p: 2,
                            borderRadius: 2,
                            border: `1px solid ${
                              isSelected
                                ? alpha(theme.palette.primary.main, 0.6)
                                : theme.palette.divider
                            }`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isSelected
                              ? alpha(theme.palette.primary.light, 0.12)
                              : alpha(theme.palette.background.default, 0.6),
                            boxShadow: isSelected
                              ? `0 6px 16px ${alpha(
                                  theme.palette.primary.main,
                                  0.15
                                )}`
                              : 'none',
                          })}
                        >
                          <Stack spacing={2}>
                            <Box>
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="space-between"
                                flexWrap="wrap"
                              >
                                <Typography fontWeight={700}>
                                  {field.name || 'Sin nombre'}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  flexWrap="wrap"
                                >
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={
                                      field.isRented ? 'Alquiler' : 'Propio'
                                    }
                                    color={
                                      field.isRented ? 'secondary' : 'primary'
                                    }
                                  />
                                  <Chip size="small" {...statusChip} />
                                </Stack>
                              </Stack>
                            </Box>
                          </Stack>
                        </Box>
                      );
                    }
                  )}
                </Stack>
              </Box>

              <Box
                sx={(theme) => ({
                  flexGrow: 1,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  p: 3,
                  background: alpha(theme.palette.background.paper, 0.95),
                })}
              >
                {!selectedField ? (
                  <Box
                    sx={(theme) => ({
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 2,
                      border: `1px dashed ${alpha(
                        theme.palette.text.primary,
                        0.2
                      )}`,
                    })}
                  >
                    <Typography color="text.secondary">
                      Selecciona un campo para ver sus lotes.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={3}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h4" fontWeight={700}>
                          {selectedField.field.name || 'Campo sin nombre'} -
                        </Typography>
                        {renderFieldLocationLink(selectedField.field.location)}
                      </Stack>
                    </Box>

                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                      <Box
                        sx={(theme) => ({
                          flex: 1,
                          px: 2,
                          py: 1.5,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                        })}
                      >
                        <Typography variant="subtitle2" color="text.secondary">
                          SUPERFICIE TOTAL
                        </Typography>
                        <Typography variant="h5" paddingTop="0.5rem">
                          {formatArea(selectedField.field.totalAreaHa)} ha
                        </Typography>
                      </Box>
                      <Box
                        sx={(theme) => ({
                          flex: 1,
                          px: 2,
                          py: 1.5,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(
                            theme.palette.success.main,
                            0.2
                          )}`,
                          backgroundColor: alpha(
                            theme.palette.success.main,
                            0.05
                          ),
                        })}
                      >
                        <Typography variant="subtitle2" color="text.secondary">
                          SUPERFICIE ACTIVA{' '}
                          {selectedPeriod && `(${selectedPeriod})`}
                        </Typography>
                        <Typography
                          variant="h5"
                          paddingTop="0.5rem"
                          color="success.main"
                        >
                          {formatArea(selectedFieldActiveArea)} ha
                        </Typography>
                      </Box>
                      <Box
                        sx={(theme) => ({
                          flex: 1,
                          px: 2,
                          py: 1.5,
                          borderRadius: 1.5,
                          border: `1px solid ${theme.palette.divider}`,
                        })}
                      >
                        <Typography variant="subtitle2" color="text.secondary">
                          LOTES ACTIVOS
                        </Typography>
                        <Typography variant="h5" paddingTop="0.5rem">
                          {lotsWithActiveCycle.length}/
                          {lotsWithCurrentCycle.length}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box paddingTop="1.5rem">
                      <Typography variant="h6" fontWeight={700} mb={2}>
                        Producción por cultivo
                      </Typography>
                      {!selectedFieldProduction.length ? (
                        <Typography variant="body1" color="text.secondary">
                          Sin producción registrada en este período
                        </Typography>
                      ) : (
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={(theme) => ({
                            borderRadius: 1.5,
                            maxWidth: 350,
                            backgroundColor: alpha(
                              theme.palette.primary.light,
                              0.04
                            ),
                          })}
                        >
                          <Table size="small">
                            <TableHead
                              sx={(theme) => ({
                                '& .MuiTableCell-root': {
                                  fontSize: theme.typography.subtitle2,
                                  fontWeight: 700,
                                  borderBottom: `1px solid ${alpha(
                                    theme.palette.divider,
                                    0.6
                                  )}`,
                                },
                              })}
                            >
                              <TableRow>
                                <TableCell>CULTIVO</TableCell>
                                <TableCell align="right">TOTAL KGs</TableCell>
                                <TableCell align="right">
                                  RENDIMIENTO PROM. (qq/ha)
                                </TableCell>
                              </TableRow>
                            </TableHead>

                            <TableBody
                              sx={(theme) => ({
                                '.MuiTableCell-root': {
                                  borderBottom: `1px solid ${alpha(
                                    theme.palette.divider,
                                    0.25
                                  )}`,
                                  fontSize: theme.typography.body1.fontSize,
                                  paddingY: '1rem',
                                },
                              })}
                            >
                              {selectedFieldProduction.map((item) => (
                                <TableRow key={item.crop}>
                                  <TableCell>{item.crop}</TableCell>
                                  <TableCell align="right">
                                    {formatKgs(item.totalKgs)}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={(theme) => ({
                                      fontWeight: 700,
                                      color: theme.palette.primary.dark,
                                    })}
                                  >
                                    {item.avgYield === null
                                      ? '—'
                                      : item.avgYield.toFixed(1)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="h6" fontWeight={700} mb={1.5}>
                        Lotes
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={(theme) => ({
                          borderRadius: 2,
                          overflow: 'hidden',
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
                              )} 0%, ${alpha(
                                theme.palette.primary.light,
                                0.06
                              )} 100%)`,
                              '& .MuiTableCell-root': {
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                borderBottom: `2px solid ${theme.palette.primary.main}`,
                                py: 1.25,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              },
                            })}
                          >
                            <TableRow>
                              <TableCell>Lote</TableCell>
                              <TableCell align="right">Sup. (ha)</TableCell>
                              <TableCell>Ciclo actual</TableCell>
                              <TableCell>Cultivo</TableCell>
                              <TableCell>Estado</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {lotsWithCurrentCycle.map(
                              ({ lot, currentCycle }) => (
                                <TableRow
                                  key={lot.id}
                                  sx={(theme) => ({
                                    '& .MuiTableCell-root': {
                                      borderBottom: `1px solid ${theme.palette.divider}`,
                                      py: 1.5,
                                    },
                                  })}
                                >
                                  <TableCell>
                                    <Stack spacing={0.3}>
                                      <Typography fontWeight={600}>
                                        {lot.code || `Lote ${lot.id}`}
                                      </Typography>
                                      {!currentCycle && (
                                        <Typography
                                          variant="body2"
                                          paddingTop="0.5rem"
                                          color="text.secondary"
                                        >
                                          Sin ciclo en esta campaña
                                        </Typography>
                                      )}
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1">
                                      {formatArea(lot.areaHa)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {currentCycle ? (
                                      <Typography
                                        component={Link}
                                        href={`/ciclos/${currentCycle.id}`}
                                        color="primary"
                                        sx={{
                                          textDecoration: 'none',
                                          fontWeight: 700,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {currentCycle.cycleId}
                                      </Typography>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {currentCycle ? (
                                      currentCycle.crop ? (
                                        <CropChip
                                          crop={currentCycle.crop}
                                          size="small"
                                        />
                                      ) : (
                                        '—'
                                      )
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {currentCycle ? (
                                      <StatusChip
                                        status={currentCycle.status}
                                        options={CYCLE_STATUS_OPTIONS}
                                      />
                                    ) : (
                                      <StatusChip
                                        status={null}
                                        options={CYCLE_STATUS_OPTIONS}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Stack>
                )}
              </Box>
            </Stack>

            <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {filteredFields.length === 0 && (
                <Box
                  sx={{
                    py: 4,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: (theme) =>
                      `1px dashed ${alpha(theme.palette.text.primary, 0.2)}`,
                  }}
                >
                  <Typography color="text.secondary">
                    No hay campos para los filtros seleccionados.
                  </Typography>
                </Box>
              )}
              {filteredFields.map((fieldItem) => {
                const { field, activeAreaHa, lotsWithCycle, hasActiveCycle } =
                  fieldItem;
                const lotsWithCycleCount = lotsWithCycle.length;
                const lotsWithActive = lotsWithCycle.filter((item) =>
                  Boolean(item.currentCycle)
                );
                const isExpanded = expandedFieldId === field.id;
                const productionSummary = buildProductionSummary(fieldItem);
                const statusChip = hasActiveCycle
                  ? {
                      label: 'Activo',
                      color: 'success' as const,
                      variant: 'filled' as const,
                    }
                  : {
                      label: 'Sin actividad',
                      color: 'default' as const,
                      variant: 'outlined' as const,
                    };

                return (
                  <Card
                    key={field.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: isExpanded ? 'primary.main' : 'divider',
                      backgroundColor: isExpanded
                        ? (theme) => alpha(theme.palette.primary.light, 0.08)
                        : undefined,
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Box
                          role="button"
                          onClick={() => toggleFieldExpansion(field.id)}
                          aria-expanded={isExpanded}
                          sx={{
                            cursor: 'pointer',
                          }}
                        >
                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            mt={1}
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="body1" fontWeight={700}>
                              {field.name || 'Sin nombre'}
                            </Typography>
                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              spacing={0.3}
                            >
                              <Chip
                                size="small"
                                label={field.isRented ? 'Alquiler' : 'Propio'}
                                color={field.isRented ? 'secondary' : 'primary'}
                                variant="outlined"
                              />
                              <Chip size="small" {...statusChip} />
                            </Stack>
                          </Stack>

                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            justifyItems="center"
                            marginTop="2rem"
                          >
                            <Typography
                              variant="body2"
                              color="primary"
                              fontWeight={600}
                            >
                              {isExpanded ? 'Ocultar lotes' : 'Ver lotes'}
                            </Typography>
                            <Box>{renderFieldLocationLink(field.location)}</Box>
                          </Stack>
                        </Box>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Divider sx={{ my: 2 }} />
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              paddingBottom="2rem"
                            >
                              <Stack spacing={0.75}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  SUP. TOTAL
                                </Typography>
                                <Typography fontWeight={700}>
                                  {formatArea(field.totalAreaHa)} ha
                                </Typography>
                              </Stack>
                              <Stack spacing={0.75}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  SUP. ACTIVA
                                </Typography>
                                <Typography
                                  fontWeight={700}
                                  color="success.main"
                                >
                                  {formatArea(activeAreaHa)} ha
                                </Typography>
                              </Stack>
                              <Stack spacing={0.75}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  LOTES ACTIVOS
                                </Typography>
                                <Typography fontWeight={700}>
                                  {lotsWithActive.length}/{lotsWithCycleCount}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Stack>
                          <Stack spacing={2}>
                            <Box>
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                mb={0.5}
                              >
                                Producción por cultivo
                              </Typography>

                              {!productionSummary.length ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Sin producción registrada en este período
                                </Typography>
                              ) : (
                                <Stack spacing={1}>
                                  {productionSummary.map((item) => (
                                    <Box
                                      key={item.crop}
                                      sx={(theme) => ({
                                        p: 0.5,
                                      })}
                                    >
                                      <Stack direction="row" alignItems="start">
                                        {/* Columna cultivo */}
                                        <Box sx={{ width: 75 }}>
                                          <Typography
                                            fontWeight={700}
                                            variant="body2"
                                            paddingTop="16px"
                                          >
                                            {item.crop}
                                          </Typography>
                                        </Box>

                                        {/* Columna KGS */}
                                        <Box sx={{ width: 100 }}>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            KGS
                                          </Typography>
                                          <Typography
                                            fontWeight={700}
                                            variant="body1"
                                          >
                                            {formatKgs(item.totalKgs)}
                                          </Typography>
                                        </Box>

                                        {/* Columna rendimiento */}
                                        <Box sx={{ width: 120 }}>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            REND. (qq/ha)
                                          </Typography>
                                          <Typography
                                            fontWeight={700}
                                            color="primary"
                                          >
                                            {item.avgYield === null
                                              ? '—'
                                              : item.avgYield.toFixed(1)}
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Box>

                            <Stack spacing={2}>
                              {lotsWithCycle.map(({ lot, currentCycle }) => (
                                <Card key={lot.id} variant="outlined">
                                  <CardContent>
                                    {currentCycle ? (
                                      <Stack spacing={1}>
                                        <Stack
                                          direction="row"
                                          justifyContent="space-between"
                                          alignItems="center"
                                        >
                                          <Stack
                                            direction="row"
                                            alignItems="center"
                                          >
                                            <Typography fontWeight={700}>
                                              {lot.code || `Lote ${lot.id}`} -
                                            </Typography>
                                            <Typography
                                              variant="subtitle1"
                                              paddingLeft="0.5rem"
                                            >
                                              {formatArea(lot.areaHa)} ha
                                            </Typography>
                                          </Stack>

                                          <StatusChip
                                            status={currentCycle.status}
                                            options={CYCLE_STATUS_OPTIONS}
                                          />
                                        </Stack>
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                          justifyContent="space-between"
                                          spacing={7}
                                        >
                                          <Typography
                                            component={Link}
                                            variant="body2"
                                            href={`/ciclos/${currentCycle.id}`}
                                            color="primary"
                                            sx={{
                                              textDecoration: 'none',
                                              fontWeight: 700,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {currentCycle.cycleId}
                                          </Typography>
                                          <CropChip
                                            crop={currentCycle.crop}
                                            size="small"
                                          />
                                        </Stack>
                                      </Stack>
                                    ) : (
                                      <Stack spacing={1}>
                                        <Stack
                                          direction="row"
                                          alignItems="center"
                                        >
                                          <Typography fontWeight={700}>
                                            {lot.code || `Lote ${lot.id}`} -
                                          </Typography>
                                          <Typography
                                            variant="subtitle1"
                                            paddingLeft="0.5rem"
                                          >
                                            {formatArea(lot.areaHa)} ha
                                          </Typography>
                                        </Stack>

                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          Sin ciclo en esta campaña
                                        </Typography>
                                      </Stack>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </Stack>
                          </Stack>
                        </Collapse>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        </DashboardCard>
      </Stack>
    </PageContainer>
  );
};

export default CamposPageClient;
