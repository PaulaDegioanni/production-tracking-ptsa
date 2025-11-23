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
  Divider,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import { useRouter } from 'next/navigation';
import type { CycleDto as CycleItem, CycleStatus } from '@/lib/baserow/ciclos';

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
        return 'grey[200]';
      case 'sembrado':
        return 'info';
      case 'listo-para-cosechar':
        return 'warning';
      case 'en-cosecha':
        return 'info';
      case 'cosechado':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCropColor = (cultivo: string) => {
    const c = cultivo.toLowerCase();
    if (c.includes('soja')) return 'soja';
    if (c.includes('maíz') || c.includes('maiz')) return 'maiz';
    if (c.includes('trigo')) return 'trigo';
    return 'default';
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
        {/* Encabezado */}
        <Box>
          <Typography variant="h2" component="h1" color="primary" gutterBottom>
            Ciclos de siembra
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Explora los ciclos por campaña, campo y cultivo, y accede al detalle
            de cada uno.
          </Typography>
        </Box>

        <DashboardCard>
          <Stack spacing={3}>
            {/* Filtros */}
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

            {/* Acciones */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', md: 'center' },
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {filterCycles.length} ciclo(s) encontrados.
              </Typography>
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
                  sx={{ flexGrow: { xs: 1, md: 0 } }}
                  // onClick={() => ...}  // lo definimos cuando agreguemos creación
                >
                  Crear nuevo ciclo
                </Button>
                <Button
                  variant="outlined"
                  sx={{ flexGrow: { xs: 1, md: 0 } }}
                  // onClick={() => ...}  // export a CSV más adelante
                >
                  Exportar CSV
                </Button>
              </Stack>
            </Stack>

            {/* Lista de ciclos: tabla en desktop, cards en móvil */}

            {/* 📊 Vista tabla (desktop)*/}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead
                    sx={(theme) => ({
                      backgroundColor: theme.palette.grey[100],
                      '& .MuiTableCell-root': {
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      },
                    })}
                  >
                    <TableRow>
                      {/* 1 - ID Ciclo */}
                      <TableCell>ID Ciclo</TableCell>

                      {/* 2 - Estado */}
                      <TableCell>Estado</TableCell>

                      {/* 3 - Cultivo */}
                      <TableCell>Cultivo</TableCell>

                      {/* divisor vertical */}
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                        })}
                      />

                      {/* 3 - Campo */}
                      <TableCell>Campo</TableCell>

                      {/* 4 - Superficie */}
                      <TableCell align="right">Sup. (ha)</TableCell>

                      {/* divisor vertical */}
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                        })}
                      />

                      {/* 5 - Rend. esperado */}
                      <TableCell align="right">Rend. esp. (qq/ha)</TableCell>

                      {/* 6 - Rend. obtenido */}
                      <TableCell align="right">Rend. obt. (qq/ha)</TableCell>

                      {/* divisor vertical */}
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                        })}
                      />

                      {/* 7 - Kgs stock */}
                      <TableCell align="right">Kgs stock</TableCell>

                      {/* 8 - Kgs camión */}
                      <TableCell align="right">Kgs camión</TableCell>

                      {/* 9 - Kgs totales */}
                      <TableCell align="right">Kgs totales</TableCell>

                      {/* divisor vertical */}
                      <TableCell
                        align="right"
                        sx={(theme) => ({
                          borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                        })}
                      >
                        Kgs check
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCycles.map((cycle) => (
                      <TableRow
                        key={cycle.id}
                        hover
                        sx={(theme) => ({
                          cursor: 'pointer',
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${theme.palette.divider}`,
                          },
                        })}
                        onClick={() => handleClickCycle(cycle.id)}
                      >
                        {/* 1 - ID Ciclo (con chip de cultivo) */}
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              {cycle.cycleId}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* 2 - Estado */}
                        <TableCell>
                          <Chip
                            size="small"
                            label={cycle.status.replace('-', ' ')}
                            color={getStatusColor(cycle.status) as any}
                            sx={{
                              alignSelf: 'flex-start',
                              color: 'text.primary',
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={cycle.crop}
                            color={getCropColor(cycle.crop) as any}
                            variant="outlined"
                            sx={{
                              alignSelf: 'flex-start',
                              color:
                                getCropColor(cycle.crop) === 'soja'
                                  ? '#bf73ee'
                                  : getCropColor(cycle.crop) === 'maiz'
                                  ? '#2f97a5'
                                  : getCropColor(cycle.crop) === 'trigo'
                                  ? '#86b300' // trigo verde-dorado
                                  : undefined,
                              borderColor:
                                getCropColor(cycle.crop) === 'soja'
                                  ? '#bf73ee'
                                  : getCropColor(cycle.crop) === 'maiz'
                                  ? '#2f97a5'
                                  : getCropColor(cycle.crop) === 'trigo'
                                  ? '#86b300'
                                  : undefined,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>

                        {/* divisor vertical */}
                        <TableCell
                          sx={(theme) => ({
                            borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                          })}
                        />

                        {/* 3 - Campo */}
                        <TableCell>{cycle.field}</TableCell>

                        {/* 4 - Superficie */}
                        <TableCell align="right">
                          {cycle.areaHa.toLocaleString('es-ES')}
                        </TableCell>

                        {/* divisor vertical */}
                        <TableCell
                          sx={(theme) => ({
                            borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                          })}
                        />

                        {/* 5 - Rend. esperado */}
                        <TableCell align="right">
                          {cycle.expectedYield.toFixed(1)}
                        </TableCell>

                        {/* 6 - Rend. obtenido */}
                        <TableCell align="right">
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {cycle.actualYield.toFixed(1)}
                          </Box>
                        </TableCell>

                        {/* divisor vertical */}
                        <TableCell
                          sx={(theme) => ({
                            borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                          })}
                        />

                        {/* 7 - Kgs stock */}
                        <TableCell align="right">
                          {cycle.stockKgs.toLocaleString('es-ES')}
                        </TableCell>

                        {/* 8 - Kgs camión */}
                        <TableCell align="right">
                          {cycle.truckKgs.toLocaleString('es-ES')}
                        </TableCell>

                        {/* 9 - Kgs totales */}
                        <TableCell align="right">
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {cycle.totalKgs.toLocaleString('es-ES')}
                          </Box>
                        </TableCell>

                        {/* 10 - Kgs check (con divisor y color) */}
                        <TableCell
                          align="right"
                          sx={(theme) => ({
                            borderLeft: `1.5px solid ${theme.palette.grey[300]}`,
                          })}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={'600'}
                            color={
                              cycle.checkKgs === 0 ? '#468b5d' : 'secondary'
                            }
                          >
                            {cycle.checkKgs.toLocaleString('es-ES')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filterCycles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} align="center">
                          No hay ciclos para los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            {/* 📱 Vista cards (móvil) */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2}>
                {filteredCycles.map((cycle) => (
                  <Card
                    key={cycle.id}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleClickCycle(cycle.id)}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="subtitle1">
                            {cycle.cycleId}
                          </Typography>
                          <Chip
                            size="small"
                            label={cycle.status.replace('-', ' ')}
                            color={getStatusColor(cycle.status) as any}
                            sx={{ color: 'text.primary' }}
                          />
                        </Stack>
                        <Stack
                          direction="row"
                          justifyContent="left"
                          alignItems="center"
                        >
                          <Chip
                            size="small"
                            label={cycle.crop}
                            color={getCropColor(cycle.crop) as any}
                            variant="outlined"
                            sx={{
                              alignSelf: 'flex-start',
                              color:
                                getCropColor(cycle.crop) === 'soja'
                                  ? '#bf73ee'
                                  : getCropColor(cycle.crop) === 'maiz'
                                  ? '#2f97a5'
                                  : getCropColor(cycle.crop) === 'trigo'
                                  ? '#86b300'
                                  : undefined,
                              borderColor:
                                getCropColor(cycle.crop) === 'soja'
                                  ? '#bf73ee'
                                  : getCropColor(cycle.crop) === 'maiz'
                                  ? '#2f97a5'
                                  : getCropColor(cycle.crop) === 'trigo'
                                  ? '#86b300'
                                  : undefined,
                              fontWeight: 600,
                            }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            marginLeft="8px"
                          >
                            {cycle.field} · {cycle.year}
                          </Typography>
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Sup. (ha)
                          </Typography>
                          <Typography variant="body2">
                            {cycle.areaHa.toLocaleString('es-ES')}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Rend. esp. / obt.
                          </Typography>
                          <Typography variant="body2">
                            {cycle.expectedYield.toFixed(1)} /{' '}
                            {cycle.actualYield.toFixed(1)} qq/ha
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Kgs totales
                          </Typography>
                          <Typography variant="body2">
                            {cycle.totalKgs.toLocaleString('es-ES')}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Stock / Camión
                          </Typography>
                          <Typography variant="body2">
                            {cycle.stockKgs.toLocaleString('es-ES')} /{' '}
                            {cycle.truckKgs.toLocaleString('es-ES')}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Kgs check
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={'600'}
                            color={
                              cycle.checkKgs === 0 ? '#468b5d' : 'secondary'
                            }
                          >
                            {cycle.checkKgs.toLocaleString('es-ES')}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                {filterCycles.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No hay ciclos para los filtros seleccionados.
                  </Typography>
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
