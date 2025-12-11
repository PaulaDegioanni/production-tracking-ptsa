'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Typography,
  FormControl,
  Grid,
  Paper,
  alpha,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Card,
  CardContent,
} from '@mui/material';
import Link from 'next/link';

import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import StatusChip, {
  StatusChipOption,
} from '@/app/(DashboardLayout)/components/shared/StatusChip';
import CropChip from '@/app/(DashboardLayout)/components/shared/CropChip';
import type { TruckTripDto, TripOriginType } from '@/lib/baserow/truckTrips';

type ViajesDeCamionClientProps = {
  initialTrips: TruckTripDto[];
};

/* --------- Helpers puros --------- */

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

const formatDateForCompare = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10); // yyyy-mm-dd
};

const getOriginLabel = (originType: TripOriginType): string => {
  switch (originType) {
    case 'harvest':
      return 'Cosecha';
    case 'stock':
      return 'Stock';
    default:
      return 'Sin origen';
  }
};

const getOriginChipColor = (
  originType: TripOriginType
): 'default' | 'warning.dark' | 'success.dark' => {
  switch (originType) {
    case 'harvest':
      return 'success.dark';
    case 'stock':
      return 'warning.dark';
    default:
      return 'default';
  }
};

const TRIP_STATUS_OPTIONS: StatusChipOption[] = [
  { value: 'Entregado', color: 'success' },
  { value: 'En viaje', color: 'warning' },
  { value: 'Pendiente', color: 'info' },
];

const getDestinationLabel = (trip: TruckTripDto): string => {
  if (trip.destinationDetail) return trip.destinationDetail;
  if (trip.destinationType) return trip.destinationType;
  return '—';
};

/* --------- Componente principal --------- */

const ViajesDeCamionClient = ({ initialTrips }: ViajesDeCamionClientProps) => {
  // Filtros
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [fieldFilter, setFieldFilter] = React.useState<string>('all');
  const [cycleFilter, setCycleFilter] = React.useState<string>('all');
  const [destinationFilter, setDestinationFilter] =
    React.useState<string>('all');
  const [originFilter, setOriginFilter] = React.useState<
    TripOriginType | 'all'
  >('all');

  // Valores únicos para selects
  const uniqueFields = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialTrips
            .map((t: TruckTripDto) => {
              return (
                t.originField ||
                t.originFieldFromStock ||
                t.originFieldFromHarvest
              );
            })
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [initialTrips]
  );

  const uniqueCycles = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialTrips
            .map((t: TruckTripDto) => t.cycleLabel)
            .filter((v): v is string => Boolean(v))
        )
      ).sort(),
    [initialTrips]
  );

  // Destino: todas las opciones que se muestran en la tabla (getDestinationLabel)
  const uniqueDestinations = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialTrips
            .map((t: TruckTripDto) => getDestinationLabel(t))
            .filter((v) => v !== '—')
        )
      ).sort(),
    [initialTrips]
  );

  // Trips filtrados
  const filteredTrips = React.useMemo<TruckTripDto[]>(() => {
    return initialTrips.filter((trip: TruckTripDto) => {
      const tripDate = formatDateForCompare(trip.date);

      // Fecha
      if (dateFrom && tripDate && tripDate < dateFrom) return false;
      if (dateTo && tripDate && tripDate > dateTo) return false;

      // Campo
      if (fieldFilter !== 'all') {
        const fieldCandidate =
          trip.originField ||
          trip.originFieldFromStock ||
          trip.originFieldFromHarvest;
        if (fieldCandidate !== fieldFilter) return false;
      }

      // Ciclo
      if (cycleFilter !== 'all') {
        if (trip.cycleLabel !== cycleFilter) return false;
      }

      // Destino
      if (destinationFilter !== 'all') {
        const tableDestination = getDestinationLabel(trip);
        if (tableDestination !== destinationFilter) return false;
      }

      // Origen
      if (originFilter !== 'all') {
        if (trip.originType !== originFilter) return false;
      }

      return true;
    });
  }, [
    initialTrips,
    dateFrom,
    dateTo,
    fieldFilter,
    cycleFilter,
    destinationFilter,
    originFilter,
  ]);

  return (
    <PageContainer
      title="Viajes de camión"
      description="Logística de salida de la cosecha"
    >
      <Stack spacing={3}>
        {/* Encabezado */}
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
            Viajes de camión
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '800px' }}
          >
            Vista consolidada de la logística de salida: camiones, kilos y
            destinos.
          </Typography>
        </Box>

        {/* Filtros */}
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
                    label="Fecha desde"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Fecha hasta"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Campo"
                    select
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
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
                    label="Ciclo"
                    select
                    value={cycleFilter}
                    onChange={(e) => setCycleFilter(e.target.value)}
                    fullWidth
                    sx={{ bgcolor: 'background.paper' }}
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueCycles.map((ciclo) => (
                      <MenuItem key={ciclo} value={ciclo}>
                        {ciclo}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Destino"
                    select
                    value={destinationFilter}
                    onChange={(e) => setDestinationFilter(e.target.value)}
                    fullWidth
                    sx={{ bgcolor: 'background.paper' }}
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueDestinations.map((dest) => (
                      <MenuItem key={dest} value={dest}>
                        {dest}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
                <FormControl fullWidth size="small">
                  <TextField
                    label="Origen"
                    select
                    value={originFilter}
                    sx={{ bgcolor: 'background.paper' }}
                    onChange={(e) =>
                      setOriginFilter(e.target.value as TripOriginType | 'all')
                    }
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="harvest">Cosecha</MenuItem>
                    <MenuItem value="stock">Stock</MenuItem>
                    <MenuItem value="unknown">Sin origen</MenuItem>
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
                  {filteredTrips.length} viaje
                  {filteredTrips.length !== 1 ? 's' : ''} registrado
                  {filteredTrips.length !== 1 ? 's' : ''}
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
                  Registrar nuevo viaje
                </Button>
                <Button variant="outlined" sx={{ flexGrow: { xs: 1, md: 0 } }}>
                  Exportar CSV
                </Button>
              </Stack>
            </Stack>

            {/* Tabla de viajes */}

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
                <Table size="small" sx={{ minWidth: 600 }}>
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
                      <TableCell>ID Viaje</TableCell>
                      <TableCell>Camión</TableCell>
                      <TableCell>Fecha de salida</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      />
                      <TableCell>Ciclo</TableCell>
                      <TableCell>Origen</TableCell>
                      <TableCell>Destino</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      />
                      <TableCell align="right">Kgs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTrips.map((trip, index) => {
                      const fieldLabel =
                        trip.originField ||
                        trip.originFieldFromStock ||
                        trip.originFieldFromHarvest ||
                        '';
                      const { date, time } = formatDateTimeParts(trip.date);
                      return (
                        <TableRow
                          key={trip.id}
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
                              transform: 'scale(1.005)',
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
                          {/* ID */}
                          <TableCell>
                            <Typography variant="body1" fontWeight={600}>
                              {trip.tripId}
                            </Typography>
                          </TableCell>

                          {/* Camión */}
                          <TableCell>
                            <Stack>
                              <Chip
                                size="small"
                                label={trip.truckPlate}
                                variant="outlined"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.9rem',
                                  textTransform: 'capitalize',
                                  color: 'text.primary',
                                }}
                              />
                            </Stack>
                          </TableCell>

                          {/* Fecha */}
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {date}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{
                                display: 'block',
                                lineHeight: 1.2,
                                mt: 0.5,
                              }}
                            >
                              {time}
                            </Typography>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                            <StatusChip
                              status={trip.status}
                              options={TRIP_STATUS_OPTIONS}
                            />
                          </TableCell>
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08
                              )}`,
                            })}
                          />
                          {/* Ciclo (link al detalle) */}
                          <TableCell>
                            {trip.cycleLabel ? (
                              <Typography
                                component={Link}
                                href={`/ciclos/${trip.cycleRowId}`}
                                sx={(theme) => ({
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  textDecoration: 'none',
                                  '&:hover': {
                                    textDecoration: 'underline',
                                  },
                                })}
                              >
                                {trip.cycleLabel}
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

                          {/* Origen */}
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getOriginLabel(trip.originType)}
                                sx={(theme) => ({
                                  fontWeight: 600,
                                  fontSize: 'body1',
                                  color: `${getOriginChipColor(
                                    trip.originType
                                  )}`,
                                  border: `2px solid ${alpha(
                                    theme.palette.primary.main,
                                    0.08
                                  )}`,
                                })}
                              />
                            </Stack>
                          </TableCell>

                          {/* Destino */}
                          <TableCell>
                            <Typography variant="body1">
                              {getDestinationLabel(trip)}
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
                          {/* Kgs */}
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {trip.totalKgs.toLocaleString('es-ES')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile cards */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2}>
                {filteredTrips.map((trip) => {
                  const { date, time } = formatDateTimeParts(trip.date);
                  return (
                    <Card
                      key={trip.id}
                      sx={(theme) => ({
                        cursor: 'pointer',
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08
                        )}`,
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
                        <Stack spacing={2}>
                          {/* Header */}
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
                              {trip.tripId}
                            </Typography>

                            <StatusChip
                              status={trip.status}
                              options={TRIP_STATUS_OPTIONS}
                            />
                          </Stack>

                          <Typography variant="body2" fontWeight={700}>
                            {date} - {time}
                          </Typography>

                          <Box
                            sx={(theme) => ({
                              height: '1px',
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />

                          {/* Origen + Kgs */}
                          <Stack direction="row" justifyContent="space-between">
                            <Stack
                              direction="row"
                              spacing={4}
                              justifyContent="flex-start"
                            >
                              <Stack spacing={1.5} alignItems="center">
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  Origen
                                </Typography>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={getOriginLabel(trip.originType)}
                                  sx={(theme) => ({
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    color: `${getOriginChipColor(
                                      trip.originType
                                    )}`,
                                    border: `2px solid ${alpha(
                                      theme.palette.primary.main,
                                      0.08
                                    )}`,
                                  })}
                                />
                              </Stack>
                              <Stack spacing={1.5} alignItems="start">
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  Destino
                                </Typography>
                                <Typography variant="body2" mt={0.5}>
                                  {getDestinationLabel(trip)}
                                </Typography>
                              </Stack>
                            </Stack>
                            <Stack spacing={1.5} alignItems="start">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs
                              </Typography>
                              <Typography
                                variant="body1"
                                mt={0.3}
                                fontWeight={800}
                                color="text.primary"
                              >
                                {trip.totalKgs.toLocaleString('es-ES')} kg
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

export default ViajesDeCamionClient;
