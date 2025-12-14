'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
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

const getYearFromDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
};

const hasDirectTrips = (harvest: HarvestDto): boolean => {
  if (harvest.directTruckTripIds.length > 0) return true;
  if (harvest.directTruckKgs > 0) return true;
  return false;
};

/* --------- Component --------- */

const CosechasPageClient = ({ initialHarvests }: CosechasPageClientProps) => {
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [fieldFilter, setFieldFilter] = React.useState<string>('all');
  const [cropFilter, setCropFilter] = React.useState<string>('all');
  const [onlyWithKgs, setOnlyWithKgs] = React.useState<boolean>(true);
  const [directTripsFilter, setDirectTripsFilter] = React.useState<
    'all' | 'yes' | 'no'
  >('all');

  const uniqueYears = React.useMemo(() => {
    const years = Array.from(
      new Set(
        initialHarvests
          .map((h) => getYearFromDate(h.date))
          .filter((year): year is string => Boolean(year))
      )
    ).sort((a, b) => Number(b) - Number(a));

    return years;
  }, [initialHarvests]);

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
      const year = getYearFromDate(harvest.date);
      if (yearFilter !== 'all' && year !== yearFilter) return false;

      if (fieldFilter !== 'all' && harvest.field !== fieldFilter) return false;
      if (cropFilter !== 'all' && harvest.crop !== cropFilter) return false;

      if (onlyWithKgs && harvest.harvestedKgs === 0) return false;

      if (directTripsFilter === 'yes' && !hasDirectTrips(harvest)) return false;
      if (directTripsFilter === 'no' && hasDirectTrips(harvest)) return false;

      return true;
    });
  }, [
    initialHarvests,
    yearFilter,
    fieldFilter,
    cropFilter,
    onlyWithKgs,
    directTripsFilter,
  ]);

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
        acc.totalToStockKgs += Math.max(
          harvest.harvestedKgs - harvest.directTruckKgs,
          0
        );
        acc.harvestCount += 1;
        acc.directTripCount += harvest.directTruckTripIds.length;
        acc.stockTripCount += harvest.stockTruckTripIds.length;
        return acc;
      },
      {
        totalHarvestedKgs: 0,
        totalDirectTruckKgs: 0,
        totalToStockKgs: 0,
        harvestCount: 0,
        directTripCount: 0,
        stockTripCount: 0,
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
                    label="Año"
                    select
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueYears.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
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
                    label="Viajes directos"
                    select
                    value={directTripsFilter}
                    onChange={(event) =>
                      setDirectTripsFilter(
                        event.target.value as 'all' | 'yes' | 'no'
                      )
                    }
                    fullWidth
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="yes">Solo con viajes</MenuItem>
                    <MenuItem value="no">Sin viajes directos</MenuItem>
                  </TextField>
                </FormControl>
              </Stack>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                sx={{
                  mt: 2,
                  alignItems: { xs: 'flex-start', md: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      color="primary"
                      checked={onlyWithKgs}
                      onChange={(event) => setOnlyWithKgs(event.target.checked)}
                    />
                  }
                  label="Solo con kgs"
                />
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
                    {filteredHarvests.length === 1 ? '' : 's'} filtrada
                    {filteredHarvests.length === 1 ? '' : 's'}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Desktop table */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
                      <TableCell>Fecha</TableCell>
                      <TableCell>Campo</TableCell>
                      <TableCell>Cultivo</TableCell>
                      <TableCell align="center">Lotes</TableCell>
                      <TableCell>Ciclo</TableCell>
                      <TableCell align="right">Kgs cosechados</TableCell>
                      <TableCell align="right">Kgs camión directo</TableCell>
                      <TableCell align="center">Viajes directos</TableCell>
                      <TableCell align="center">Viajes desde stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedHarvests.map((harvest, index) => {
                      const { date, time } = formatDateTimeParts(harvest.date);
                      const harvestId = harvest.harvestId || `#${harvest.id}`;
                      const lotsCount = harvest.lotsIds.length;
                      const directTrips = harvest.directTruckTripIds.length;
                      const stockTrips = harvest.stockTruckTripIds.length;

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
                            {time ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {time}
                              </Typography>
                            ) : null}
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
                            <Typography variant="body2" fontWeight={600}>
                              {harvest.field || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <CropChip crop={harvest.crop} />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={700}>
                              {lotsCount}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {harvest.cycleIds.length === 1 ? (
                              <Typography
                                component={Link}
                                href={`/ciclos/${harvest.cycleIds[0]}`}
                                sx={(theme) => ({
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                })}
                              >
                                {harvest.cycleLabels[0] ||
                                  `Ciclo ${harvest.cycleIds[0]}`}
                              </Typography>
                            ) : harvest.cycleIds.length > 1 ? (
                              <Typography
                                variant="body2"
                                color="primary"
                                fontWeight={700}
                              >
                                Ver ({harvest.cycleIds.length})
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
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
                              {formatKgs(harvest.directTruckKgs)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" fontWeight={600}>
                              {directTrips}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body1" fontWeight={600}>
                              {stockTrips}
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
                      <TableCell colSpan={6} align="right">
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Typography variant="body1" fontWeight={800}>
                            Total
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Kgs a stock: {formatKgs(totals.totalToStockKgs)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Cosechas: {totals.harvestCount}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={700}>
                          {formatKgs(totals.totalHarvestedKgs)}
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
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight={700}>
                          {totals.directTripCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1" fontWeight={700}>
                          {totals.stockTripCount}
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
                            Kgs cosechados
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {formatKgs(totals.totalHarvestedKgs)} kg
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Kgs directos
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            color="primary"
                          >
                            {formatKgs(totals.totalDirectTruckKgs)} kg
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Kgs a stock
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {formatKgs(totals.totalToStockKgs)} kg
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        spacing={1.5}
                      >
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Cosechas
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {totals.harvestCount}
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Viajes directos
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {totals.directTripCount}
                          </Typography>
                        </Stack>
                        <Stack spacing={0.2}>
                          <Typography variant="caption" color="text.secondary">
                            Viajes desde stock
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {totals.stockTripCount}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {sortedHarvests.map((harvest) => {
                  const { date, time } = formatDateTimeParts(harvest.date);
                  const directTrips = harvest.directTruckTripIds.length;
                  const stockTrips = harvest.stockTruckTripIds.length;
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
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              color="primary"
                            >
                              {harvest.harvestId || `#${harvest.id}`}
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {date}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {time || '—'}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Chip
                              size="small"
                              label={harvest.field || 'Sin campo'}
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                            <CropChip crop={harvest.crop} size="small" />
                          </Stack>
                          {harvest.cycleIds.length === 1 ? (
                            <Typography
                              component={Link}
                              href={`/ciclos/${harvest.cycleIds[0]}`}
                              sx={(theme) => ({
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                              })}
                            >
                              {harvest.cycleLabels[0] ||
                                `Ciclo ${harvest.cycleIds[0]}`}
                            </Typography>
                          ) : harvest.cycleIds.length > 1 ? (
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color="primary"
                            >
                              Ver ({harvest.cycleIds.length})
                            </Typography>
                          ) : null}
                          <Box
                            sx={(theme) => ({
                              height: 1,
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />
                          <Stack direction="row" justifyContent="space-between">
                            <Stack spacing={0.2}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs cosechados
                              </Typography>
                              <Typography variant="body1" fontWeight={700}>
                                {formatKgs(harvest.harvestedKgs)} kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.2}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs directos
                              </Typography>
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                color="primary"
                              >
                                {formatKgs(harvest.directTruckKgs)} kg
                              </Typography>
                            </Stack>
                            <Stack spacing={0.2} alignItems="flex-end">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Viajes
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                Dir: {directTrips}
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                Stock: {stockTrips}
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
