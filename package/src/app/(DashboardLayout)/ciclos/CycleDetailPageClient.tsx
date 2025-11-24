'use client';

import * as React from 'react';
import {
  Box,
  Stack,
  Typography,
  Grid,
  Chip,
  Paper,
  alpha,
} from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import type { CycleDto as CycleItem, CycleStatus } from '@/lib/baserow/cycles';

type CycleDetailPageClientProps = {
  cycle: CycleItem;
};

const CycleDetailPageClient = ({ cycle }: CycleDetailPageClientProps) => {
  // ---- helpers ----

  const formatDate = (value?: string | null) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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

  const getCropColor = (crop: string) => {
    const c = crop.toLowerCase();
    if (c.includes('soja')) return '#bf73ee';
    if (c.includes('maíz') || c.includes('maiz')) return '#2f97a5';
    if (c.includes('trigo')) return '#86b300';
    return '#5A6A85';
  };

  const kgsFromStock = cycle.stockKgs;
  const kgsFromHarvest = Math.max(cycle.truckKgs - cycle.stockKgs, 0);

  // ---- UI ----

  return (
    <PageContainer
      title={`Ciclo ${cycle.cycleId}`}
      description="Detalle completo del ciclo de siembra"
    >
      <Stack spacing={3}>
        {/* A. Encabezado */}
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
            {cycle.cycleId}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: '900px', mb: 2 }}
          >
            {cycle.crop} · {cycle.field} · Campaña {cycle.year}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
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
            <Chip
              size="small"
              label={cycle.field}
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
            <Chip
              size="small"
              label={cycle.crop}
              sx={(theme) => ({
                bgcolor: alpha(getCropColor(cycle.crop), 0.12),
                color: getCropColor(cycle.crop),
                borderColor: alpha(getCropColor(cycle.crop), 0.3),
                borderWidth: 1.5,
                borderStyle: 'solid',
                fontWeight: 600,
              })}
            />
          </Stack>
        </Box>

        {/* B. Resumen de KPIs */}
        <DashboardCard title="Resumen del ciclo">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.03
                  )} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Superficie total
                </Typography>
                <Typography variant="h6" mt={0.5} fontWeight={700}>
                  {cycle.areaHa.toLocaleString('es-ES')} ha
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.info.main,
                    0.04
                  )} 0%, ${alpha(theme.palette.info.light, 0.04)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Rendimiento (qq/ha)
                </Typography>
                <Typography variant="body2" mt={0.5}>
                  <Box component="span" color="text.secondary">
                    Esperado: {cycle.expectedYield.toFixed(1)}
                  </Box>
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {cycle.actualYield.toFixed(1)} qq/ha
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.success.main,
                    0.04
                  )} 0%, ${alpha(theme.palette.success.light, 0.04)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Kgs cosechados totales
                </Typography>
                <Typography variant="h6" mt={0.5} fontWeight={700}>
                  {cycle.totalKgs.toLocaleString('es-ES')} kg
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.secondary.main,
                    0.03
                  )} 0%, ${alpha(theme.palette.secondary.light, 0.04)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Kgs Check
                </Typography>
                <Box
                  sx={(theme) => ({
                    mt: 0.5,
                    display: 'inline-flex',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
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
                      cycle.checkKgs === 0 ? 'success.dark' : 'secondary.main'
                    }
                  >
                    {cycle.checkKgs.toLocaleString('es-ES')} kg
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.warning.main,
                    0.04
                  )} 0%, ${alpha(theme.palette.warning.light, 0.04)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Kgs en stock
                </Typography>
                <Typography variant="h6" mt={0.5} fontWeight={700}>
                  {cycle.stockKgs.toLocaleString('es-ES')} kg
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.info.main,
                    0.04
                  )} 0%, ${alpha(theme.palette.info.light, 0.04)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  Kgs enviados en camión
                </Typography>
                <Typography variant="body2" mt={0.5} color="text.secondary">
                  Desde stock: {kgsFromStock.toLocaleString('es-ES')} kg
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Desde cosecha: {kgsFromHarvest.toLocaleString('es-ES')} kg
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {cycle.truckKgs.toLocaleString('es-ES')} kg
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DashboardCard>

        {/* C. Línea de tiempo */}
        <DashboardCard title="Línea de tiempo del ciclo">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Fecha de siembra
              </Typography>
              <Typography variant="body1" mt={0.5}>
                {formatDate(cycle.sowingDate)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Fecha estimada de cosecha
              </Typography>
              <Typography variant="body1" mt={0.5}>
                {formatDate(cycle.estimatedHarvestDate)}
              </Typography>
            </Grid>

            {/* Estos campos los rellenaremos cuando tengamos las tablas de Cosechas */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Inicio de cosecha
              </Typography>
              <Typography variant="body1" mt={0.5}>
                Próximamente (desde tabla de Cosechas)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Fin de cosecha
              </Typography>
              <Typography variant="body1" mt={0.5}>
                Próximamente (desde tabla de Cosechas)
              </Typography>
            </Grid>
          </Grid>
        </DashboardCard>

        {/* D–H: secciones a implementar cuando conectemos Lotes, Cosechas, Stock y Viajes */}
        {/* Más adelante acá añadiremos:
            - Tabla de lotes del ciclo
            - Cosechas asociadas
            - Stock (bolsones)
            - Viajes de camión
            - Panel de control de kilos
        */}
      </Stack>
    </PageContainer>
  );
};

export default CycleDetailPageClient;
