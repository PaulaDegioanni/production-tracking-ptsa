'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import { useRouter } from 'next/navigation';
import type { CycleDto as CycleItem, CycleStatus } from '@/lib/baserow/cycles';

type CiclosPageClientProps = {
  initialCiclos: CycleItem[];
};

const CiclosPageClient = ({ initialCiclos }: CiclosPageClientProps) => {
  const router = useRouter();

  // estado de filtros
  const [yearFilter, setYearFilter] = React.useState<string>('2025');
  const [cropFilter, setCropFilter] = React.useState<string>('all');
  const [fieldFilter, setFieldFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const filterCycles = (cycle: CycleItem) => {
    const matchYear = yearFilter === 'all' || cycle.year === yearFilter;

    const matchCrop =
      cropFilter === 'all' ||
      cycle.crop.toLowerCase() === cropFilter.toLowerCase();

    const matchField =
      fieldFilter === 'all' ||
      cycle.field.toLowerCase().includes(fieldFilter.toLowerCase());

    const matchStatus = statusFilter === 'all' || cycle.status === statusFilter;

    return matchYear && matchCrop && matchField && matchStatus;
  };

  const filteredCycles = initialCiclos.filter(filterCycles);

  const getStatusColor = (status: CycleStatus) => {
    switch (status) {
      case 'planificado':
        return 'default';
      case 'sembrado':
        return 'info';
      case 'listo-para-cosechar':
        return 'warning';
      case 'en-cosecha':
        return 'primary';
      case 'cosechado':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCropColor = (cultivo: string) => {
    const c = cultivo.toLowerCase();
    if (c.includes('soja')) return '#bf73ee';
    if (c.includes('maíz') || c.includes('maiz')) return '#2f97a5';
    if (c.includes('trigo')) return '#86b300';
    return '#5A6A85';
  };

  const handleClickCycle = (id: number) => {
    router.push(`/ciclos/${id}`);
  };

  return (
    <PageContainer
      title="Ciclos de siembra"
      description="Listado de ciclos de siembra con métricas clave y estado."
    >
      <Stack spacing={3}>
        {/* Encabezado con diseño moderno */}
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
            Ciclos de siembra
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '800px' }}
          >
            Explora los ciclos por campaña, campo y cultivo, y accede al detalle
            de cada uno.
          </Typography>
        </Box>

        <DashboardCard>
          <Stack spacing={3}>
            {/* Filtros con diseño mejorado */}
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
                  <InputLabel id="filtro-anio-label">Año</InputLabel>
                  <Select
                    labelId="filtro-anio-label"
                    label="Año"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="2025">2025</MenuItem>
                    <MenuItem value="2024">2024</MenuItem>
                    <MenuItem value="all">Todas</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="filtro-cultivo-label">Cultivo</InputLabel>
                  <Select
                    labelId="filtro-cultivo-label"
                    label="Cultivo"
                    value={cropFilter}
                    onChange={(e) => setCropFilter(e.target.value)}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="Soja">Soja</MenuItem>
                    <MenuItem value="Maiz">Maíz</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="filtro-campo-label">Campo</InputLabel>
                  <Select
                    labelId="filtro-campo-label"
                    label="Campo"
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="ADELIA MARIA">ADELIA MARIA</MenuItem>
                    <MenuItem value="BOGINO">BOGINO</MenuItem>
                    <MenuItem value="GHIGLIONE">GHIGLIONE</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="filtro-estado-label">Estado</InputLabel>
                  <Select
                    labelId="filtro-estado-label"
                    label="Estado"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="planificado">Planificado</MenuItem>
                    <MenuItem value="sembrado">Sembrado</MenuItem>
                    <MenuItem value="listo-para-cosechar">
                      Listo para cosechar
                    </MenuItem>
                    <MenuItem value="en-cosecha">En cosecha</MenuItem>
                    <MenuItem value="cosechado">Cosechado</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Acciones con mejor layout */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
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
                <Typography variant="body2" color="primary" fontWeight={600}>
                  {filteredCycles.length} ciclo
                  {filteredCycles.length !== 1 ? 's' : ''} encontrado
                  {filteredCycles.length !== 1 ? 's' : ''}
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
                  Crear nuevo ciclo
                </Button>
                <Button variant="outlined" sx={{ flexGrow: { xs: 1, md: 0 } }}>
                  Exportar CSV
                </Button>
              </Stack>
            </Stack>

            {/* 📊 Vista tabla (desktop) con diseño moderno */}
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
                <Table size="small" sx={{ minWidth: 960 }}>
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
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      },
                    })}
                  >
                    <TableRow>
                      <TableCell>ID Ciclo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Cultivo</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      />
                      <TableCell>Campo</TableCell>
                      <TableCell align="right">Sup. (ha)</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      />
                      <TableCell align="right">Rend. esp. (qq/ha)</TableCell>
                      <TableCell align="right">Rend. obt. (qq/ha)</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      />
                      <TableCell align="right">Kgs stock</TableCell>
                      <TableCell align="right">Kgs camión</TableCell>
                      <TableCell align="right">Kgs totales</TableCell>
                      <TableCell
                        align="right"
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        })}
                      >
                        Kgs check
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCycles.map((cycle, index) => (
                      <TableRow
                        key={cycle.id}
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
                        onClick={() => handleClickCycle(cycle.id)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {cycle.cycleId}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={cycle.status.replaceAll('-', ' ')}
                            color={getStatusColor(cycle.status) as any}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'capitalize',
                              color: 'text.primary',
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={cycle.crop}
                            sx={(theme) => ({
                              bgcolor: alpha(getCropColor(cycle.crop), 0.12),
                              color: getCropColor(cycle.crop),
                              borderColor: getCropColor(cycle.crop),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              border: `1.5px solid ${alpha(
                                getCropColor(cycle.crop),
                                0.3
                              )}`,
                            })}
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

                        <TableCell>
                          <Typography variant="body2">{cycle.field}</Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="body2">
                            {cycle.areaHa.toLocaleString('es-ES')}
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
                          <Typography variant="body2" color="text.secondary">
                            {cycle.expectedYield.toFixed(1)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color="primary"
                          >
                            {cycle.actualYield.toFixed(1)}
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
                          <Typography variant="body2">
                            {cycle.stockKgs.toLocaleString('es-ES')}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="body2">
                            {cycle.truckKgs.toLocaleString('es-ES')}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            {cycle.totalKgs.toLocaleString('es-ES')}
                          </Typography>
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={(theme) => ({
                            borderLeft: `2px solid ${alpha(
                              theme.palette.primary.main,
                              0.08
                            )}`,
                          })}
                        >
                          <Box
                            sx={(theme) => ({
                              display: 'inline-block',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor:
                                cycle.checkKgs === 0
                                  ? alpha(theme.palette.success.main, 0.15)
                                  : alpha(theme.palette.secondary.main, 0.15),
                            })}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color={
                                cycle.checkKgs === 0
                                  ? 'success.dark'
                                  : 'secondary.main'
                              }
                            >
                              {cycle.checkKgs.toLocaleString('es-ES')}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredCycles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            No hay ciclos para los filtros seleccionados.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 📱 Vista cards (móvil) con diseño moderno */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2}>
                {filteredCycles.map((cycle) => (
                  <Card
                    key={cycle.id}
                    sx={(theme) => ({
                      cursor: 'pointer',
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      transition: 'all 0.3s ease',
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
                    onClick={() => handleClickCycle(cycle.id)}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
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
                            {cycle.cycleId}
                          </Typography>
                          <Chip
                            size="small"
                            label={cycle.status.replaceAll('-', ' ')}
                            color={getStatusColor(cycle.status) as any}
                            sx={{
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              color: 'text.primary',
                            }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={cycle.crop}
                            sx={(theme) => ({
                              bgcolor: alpha(getCropColor(cycle.crop), 0.12),
                              color: getCropColor(cycle.crop),
                              fontWeight: 700,
                              border: `1.5px solid ${alpha(
                                getCropColor(cycle.crop),
                                0.3
                              )}`,
                            })}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {cycle.field} · {cycle.year}
                          </Typography>
                        </Stack>

                        <Box
                          sx={(theme) => ({
                            height: '1px',
                            background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                          })}
                        />

                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              Superficie
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {cycle.areaHa.toLocaleString('es-ES')} ha
                            </Typography>
                          </Stack>

                          <Stack direction="row" justifyContent="space-between">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              Rendimiento
                            </Typography>
                            <Typography variant="body2">
                              <Box component="span" color="text.secondary">
                                {cycle.expectedYield.toFixed(1)}
                              </Box>
                              {' / '}
                              <Box
                                component="span"
                                fontWeight={700}
                                color="primary.main"
                              >
                                {cycle.actualYield.toFixed(1)}
                              </Box>
                              {' qq/ha'}
                            </Typography>
                          </Stack>

                          <Stack direction="row" justifyContent="space-between">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              Kgs totales
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {cycle.totalKgs.toLocaleString('es-ES')}
                            </Typography>
                          </Stack>

                          <Stack direction="row" justifyContent="space-between">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              Stock / Camión
                            </Typography>
                            <Typography variant="body2">
                              {cycle.stockKgs.toLocaleString('es-ES')} /{' '}
                              {cycle.truckKgs.toLocaleString('es-ES')}
                            </Typography>
                          </Stack>

                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              Verificación
                            </Typography>
                            <Box
                              sx={(theme) => ({
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor:
                                  cycle.checkKgs === 0
                                    ? alpha(theme.palette.success.main, 0.15)
                                    : alpha(theme.palette.secondary.main, 0.15),
                              })}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color={
                                  cycle.checkKgs === 0
                                    ? 'success.dark'
                                    : 'secondary.main'
                                }
                              >
                                {cycle.checkKgs.toLocaleString('es-ES')} kg
                              </Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {filteredCycles.length === 0 && (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No hay ciclos para los filtros seleccionados.
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        </DashboardCard>
      </Stack>
    </PageContainer>
  );
};

export default CiclosPageClient;
