'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  MenuItem,
  Paper,
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

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import CropChip from '@/app/(DashboardLayout)/components/shared/CropChip';
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

/* --------- Component --------- */

const CosechasPageClient = ({ initialHarvests }: CosechasPageClientProps) => {
  const [periodFilter, setPeriodFilter] = React.useState<string>('all');
  const [fieldFilter, setFieldFilter] = React.useState<string>('all');
  const [cropFilter, setCropFilter] = React.useState<string>('all');
  const [cycleFilter, setCycleFilter] = React.useState<string>('all');

  const uniquePeriods = React.useMemo(
    () =>
      Array.from(
        new Set(
          initialHarvests
            .map((h) => (h.period ?? '').trim())
            .filter((p) => Boolean(p))
        )
      ).sort((a, b) => b.localeCompare(a)), // más nuevo arriba si es "2025/2026"
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
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    boxShadow: (theme) =>
                      `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                    '&:hover': {
                      boxShadow: (theme) =>
                        `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                    },
                  }}
                >
                  Registrar nueva cosecha
                </Button>
                <Button variant="outlined" sx={{ flexGrow: { xs: 1, md: 0 } }}>
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
                            <Typography variant="body2" fontWeight={700}>
                              {harvest.lotsIds.length ? (
                                <Stack spacing={0.5} flexWrap="wrap">
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
                          <TableCell>
                            <Typography
                              component={Link}
                              href={`/ciclos/${harvest.cycleId}`}
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
                            <Typography variant="body2" fontWeight={700}>
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
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
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
                      sx={(theme) => ({
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08
                        )}`,
                        transition: 'all 0.2s ease',
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
                            <Typography variant="body2" fontWeight={700}>
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
                            </Typography>
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
    </PageContainer>
  );
};

export default CosechasPageClient;
