"use client";

import * as React from "react";
import {
  Box,
  Stack,
  Typography,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Card,
  CardContent,
  Divider,
  alpha,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import StatusChip, {
  StatusChipOption,
} from "@/app/(DashboardLayout)/components/shared/StatusChip";
import CropChip from "@/app/(DashboardLayout)/components/shared/CropChip";
import type { CycleDetailDto } from "@/lib/baserow/cycleDetail";
import GrassIcon from "@mui/icons-material/Grass";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import DateRangeIcon from "@mui/icons-material/DateRange";
import type { CycleStatus } from "@/lib/baserow/cycles";

type CycleDetailPageClientProps = {
  initialDetail: CycleDetailDto;
};

const CycleDetailPageClient = ({
  initialDetail,
}: CycleDetailPageClientProps) => {
  const { cycle, lots, harvests, stockUnits, truckTrips } = initialDetail;

  // ------- helpers -------

  const formatDate = (value?: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const CYCLE_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "planificado", label: "Planificado", color: "default" },
    { value: "barbecho", label: "Barbecho", color: "warning" },
    { value: "sembrado", label: "Sembrado", color: "info" },
    {
      value: "listo-para-cosechar",
      label: "Listo para cosechar",
      color: "warning",
    },
    { value: "en-cosecha", label: "En cosecha", color: "primary" },
    { value: "cosechado", label: "Cosechado", color: "success" },
  ];

  const TRIP_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "Entregado", color: "success" },
    { value: "En viaje", color: "warning" },
    { value: "Pendiente", color: "info" },
  ];

  const STOCK_STATUS_OPTIONS: StatusChipOption[] = [
    { value: "Nuevo", color: "info" },
    { value: "Parcial", color: "warning" },
    { value: "Completo", color: "success" },
    { value: "Vacío", color: "default" },
  ];

  const getStockStatusLabel = (status: any): string => {
    if (!status) return "—";
    if (typeof status === "string") return status;

    if (
      typeof status === "object" &&
      "value" in status &&
      (status as any).value
    ) {
      return String((status as any).value);
    }

    return String(status);
  };

  const lotsById = React.useMemo(() => {
    const map = new Map<number, string>();
    lots.forEach((lot) => {
      map.set(lot.id, lot.code);
    });
    return map;
  }, [lots]);

  const computeHarvestTimeRange = React.useMemo(() => {
    if (!harvests.length) {
      return {
        start: null as string | null,
        end: null as string | null,
        days: null as number | null,
      };
    }
    const dates = harvests
      .map((h) => (h.date ? new Date(h.date) : null))
      .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!dates.length) {
      return { start: null, end: null, days: null };
    }

    const start = dates[0];
    const end = dates[dates.length - 1];
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      days,
    };
  }, [harvests]);

  // ------- UI -------

  return (
    <PageContainer
      title={`Ciclo ${cycle.cycleId}`}
      description="Detalle completo del ciclo de siembra"
    >
      <Stack spacing={4}>
        {/* A. Hero Header - More compact and integrated */}
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              mb: 1,
              fontSize: { xs: "2rem", md: "2.5rem" },
            }}
          >
            {cycle.cycleId}
          </Typography>
        </Box>
        {/* B. KPIs Grid - Cleaner cards */}
        <Stack direction="row" spacing={2.5}>
          <StatusChip
            status={cycle.status}
            options={CYCLE_STATUS_OPTIONS}
            sx={{
              alignSelf: "flex-start",
              fontWeight: 700,
            }}
          />
          <Stack>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.primary.main,
                    0.1,
                  )}`,
                },
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                Superficie
              </Typography>
              <Typography variant="h4" mt={1} fontWeight={800} color="primary">
                {cycle.areaHa.toLocaleString("es-ES")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                hectáreas
              </Typography>
            </Paper>
          </Stack>

          <Stack>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.info.main,
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.info.main,
                    0.1,
                  )}`,
                },
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                Rendimiento
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="baseline" mt={1}>
                <Typography variant="h4" fontWeight={800} color="info.main">
                  {cycle.actualYield.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {cycle.expectedYield.toFixed(1)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                quintales/ha
              </Typography>
            </Paper>
          </Stack>

          <Stack>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.success.main,
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.success.main,
                    0.1,
                  )}`,
                },
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                Cosechado
              </Typography>
              <Typography
                variant="h4"
                mt={1}
                fontWeight={800}
                color="success.main"
              >
                {cycle.totalKgs.toLocaleString("es-ES")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                kilogramos
              </Typography>
            </Paper>
          </Stack>

          {Boolean(computeHarvestTimeRange?.days) && (
            <Stack>
              <Paper
                elevation={0}
                sx={(theme) => ({
                  p: 2.5,
                  height: "100%",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: theme.palette.success.main,
                    boxShadow: `0 4px 12px ${alpha(
                      theme.palette.success.main,
                      0.1,
                    )}`,
                  },
                })}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  textTransform="uppercase"
                  letterSpacing="0.5px"
                >
                  Duración cosecha
                </Typography>
                <Typography
                  variant="h4"
                  mt={1}
                  fontWeight={800}
                  color="success.main"
                >
                  {computeHarvestTimeRange.days}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  días
                </Typography>
              </Paper>
            </Stack>
          )}

          <Stack>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.warning.main,
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.warning.main,
                    0.1,
                  )}`,
                },
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                En stock
              </Typography>
              <Typography
                variant="h4"
                mt={1}
                fontWeight={800}
                color="warning.main"
              >
                {cycle.stockKgs.toLocaleString("es-ES")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                kilogramos
              </Typography>
            </Paper>
          </Stack>

          <Stack>
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2.5,
                height: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.secondary.main,
                  boxShadow: `0 4px 12px ${alpha(
                    theme.palette.secondary.main,
                    0.1,
                  )}`,
                },
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                textTransform="uppercase"
                letterSpacing="0.5px"
              >
                En camión
              </Typography>
              <Typography
                variant="h4"
                mt={1}
                fontWeight={800}
                color="secondary.main"
              >
                {cycle.truckKgs.toLocaleString("es-ES")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {truckTrips.length} viajes
              </Typography>
            </Paper>
          </Stack>
        </Stack>
        {/* C. Timeline - Visual horizontal timeline */}
        <Paper
          elevation={0}
          sx={(theme) => ({
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          })}
        >
          {/* Desktop Timeline */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Box sx={{ position: "relative", px: 2 }}>
              {/* Timeline line */}
              <Box
                sx={(theme) => ({
                  position: "absolute",
                  top: "32px",
                  left: "5%",
                  right: "5%",
                  height: "2px",
                  background: `linear-gradient(
  to right,
  ${alpha(theme.palette.grey[400], 0.1)},
  ${alpha(theme.palette.grey[400], 0.95)},
  ${alpha(theme.palette.grey[400], 1)},
  ${alpha(theme.palette.grey[400], 0.2)}
)`,
                  borderRadius: "8px",
                  zIndex: 0,
                })}
              />

              {(() => {
                const hasHarvestRange =
                  Boolean(computeHarvestTimeRange?.start) &&
                  Boolean(computeHarvestTimeRange?.end);

                const harvestDateLabel = hasHarvestRange
                  ? `${formatDate(computeHarvestTimeRange.start)} – ${formatDate(
                      computeHarvestTimeRange.end,
                    )}`
                  : cycle.estimatedHarvestDate
                    ? formatDate(cycle.estimatedHarvestDate)
                    : "—";

                const harvestTitle = hasHarvestRange
                  ? "Cosecha"
                  : "Cosecha (Est.)";

                const phases = [
                  {
                    key: "fallow",
                    title: "Barbecho",
                    date: cycle.fallowStartDate
                      ? formatDate(cycle.fallowStartDate)
                      : "—",
                    color: "primary.main",
                    labelColor: "primary",
                    icon: <GrassIcon />,
                  },
                  {
                    key: "sowing",
                    title: "Siembra",
                    date: cycle.sowingDate ? formatDate(cycle.sowingDate) : "—",
                    color: "primary.main",
                    labelColor: "primary",
                    icon: <AgricultureIcon />,
                  },
                  {
                    key: "harvest",
                    title: harvestTitle,
                    date: harvestDateLabel,
                    color: hasHarvestRange ? "success.main" : "warning.main",
                    labelColor: hasHarvestRange
                      ? "success.dark"
                      : "warning.dark",
                    icon: hasHarvestRange ? (
                      <EventAvailableIcon />
                    ) : (
                      <DateRangeIcon />
                    ),
                  },
                ];

                return (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    {phases.map((p) => (
                      <Stack
                        key={p.key}
                        alignItems="center"
                        spacing={1}
                        sx={{ width: "33.333%" }} // igual espaciado
                      >
                        <Box
                          sx={(theme) => ({
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            bgcolor: p.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            position: "relative",
                            zIndex: 1,
                            boxShadow: `0 4px 12px ${alpha(
                              theme.palette[
                                typeof p.color === "string" &&
                                p.color.includes("warning")
                                  ? "warning"
                                  : typeof p.color === "string" &&
                                      p.color.includes("success")
                                    ? "success"
                                    : "primary"
                              ].main,
                              0.3,
                            )}`,
                          })}
                        >
                          {/* icono */}
                          <Box
                            sx={{ display: "flex", "& svg": { fontSize: 30 } }}
                          >
                            {p.icon}
                          </Box>
                        </Box>

                        <Typography
                          variant="caption"
                          color={p.labelColor}
                          fontWeight={700}
                          textAlign="center"
                          textTransform="uppercase"
                        >
                          {p.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          fontWeight={600}
                          textAlign="center"
                        >
                          {p.date}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                );
              })()}
            </Box>
          </Box>

          {/* Mobile Timeline */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <Stack spacing={3}>
              {[
                {
                  num: 1,
                  label: "Barbecho",
                  date: cycle.fallowStartDate,
                  color: "primary",
                },
                {
                  num: 2,
                  label: "Siembra",
                  date: cycle.sowingDate,
                  color: "primary",
                },
                {
                  num: 3,
                  label: "Cosecha Est.",
                  date: cycle.estimatedHarvestDate,
                  color: "warning",
                },
                {
                  num: 4,
                  label: "Inicio",
                  date: computeHarvestTimeRange.start,
                  color: "success",
                },
                {
                  num: 5,
                  label: "Fin",
                  date: computeHarvestTimeRange.end,
                  color: "success",
                },
              ].map((item, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                >
                  <Box
                    sx={(theme) => ({
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      bgcolor: theme.palette[item.color].main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      flexShrink: 0,
                    })}
                  >
                    {item.num}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      color={`${item.color}.dark`}
                      fontWeight={700}
                      textTransform="uppercase"
                    >
                      {item.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatDate(item.date)}
                    </Typography>
                  </Box>
                </Stack>
              ))}

              {computeHarvestTimeRange.days && (
                <Box
                  sx={(theme) => ({
                    p: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    borderRadius: 2,
                    textAlign: "center",
                  })}
                >
                  <Typography
                    variant="caption"
                    color="success.dark"
                    fontWeight={700}
                    textTransform="uppercase"
                  >
                    Duración
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={800}
                    color="success.main"
                  >
                    {computeHarvestTimeRange.days} días
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>{" "}
      </Stack>
      <Stack spacing={3}>
        {/* D. Lotes del ciclo */}
        <DashboardCard>
          <Typography variant="h6" fontWeight={700} mb={2.5} color="primary">
            Lotes ({lots.length})
          </Typography>
          {lots.length === 0 ? (
            <Box
              sx={(theme) => ({
                py: 4,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              })}
            >
              <Typography variant="body1" color="text.secondary">
                Este ciclo no tiene lotes asociados.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop table */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: "hidden",
                    boxShadow: (theme) =>
                      `0 2px 12px ${alpha(theme.palette.grey[500], 0.1)}`,
                  }}
                >
                  <Table size="small">
                    <TableHead
                      sx={(theme) => ({
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.primary.main,
                          0.08,
                        )} 0%, ${alpha(
                          theme.palette.primary.light,
                          0.08,
                        )} 100%)`,
                        "& .MuiTableCell-root": {
                          fontWeight: 700,
                          color: theme.palette.primary.main,
                          borderBottom: `2px solid ${theme.palette.primary.main}`,
                          py: 1.5,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                      })}
                    >
                      <TableRow>
                        <TableCell>Lote</TableCell>

                        <TableCell align="right">Superficie (ha)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lots.map((lot, index) => (
                        <TableRow
                          key={lot.id}
                          sx={(theme) => ({
                            bgcolor:
                              index % 2 === 0
                                ? "transparent"
                                : alpha(theme.palette.grey[100], 0.4),
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                            },
                          })}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {lot.code}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600}>
                              {lot.areaHa.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Mobile cards */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Stack spacing={2}>
                  {lots.map((lot) => (
                    <Card
                      key={lot.id}
                      sx={(theme) => ({
                        borderRadius: 2.5,
                        border: `2px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08,
                        )}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 4px 16px ${alpha(
                            theme.palette.primary.main,
                            0.12,
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
                              {lot.code}
                            </Typography>
                          </Stack>

                          <Typography variant="h6" fontWeight={700}>
                            {lot.areaHa.toLocaleString("es-ES")} ha
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </DashboardCard>

        {/* E. Cosechas asociadas */}
        <DashboardCard>
          <Typography variant="h6" fontWeight={700} mb={2.5} color="primary">
            Cosechas ({harvests.length})
          </Typography>
          {harvests.length === 0 ? (
            <Box
              sx={(theme) => ({
                py: 4,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              })}
            >
              <Typography variant="body1" color="text.secondary">
                No hay cosechas registradas para este ciclo.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop table */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: "hidden",
                    boxShadow: (theme) =>
                      `0 2px 12px ${alpha(theme.palette.grey[500], 0.1)}`,
                  }}
                >
                  <Table size="small">
                    <TableHead
                      sx={(theme) => ({
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.success.main,
                          0.1,
                        )} 0%, ${alpha(
                          theme.palette.success.light,
                          0.1,
                        )} 100%)`,
                        "& .MuiTableCell-root": {
                          fontWeight: 700,
                          color: theme.palette.success.dark,
                          borderBottom: `2px solid ${theme.palette.success.main}`,
                          py: 1.5,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                      })}
                    >
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Lotes</TableCell>
                        <TableCell align="right">Kgs cosechados</TableCell>
                        <TableCell align="right">Kgs camión directo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {harvests.map((h, index) => {
                        const lotNames = h.lotsIds
                          .map((id) => lotsById.get(id))
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <TableRow
                            key={h.id}
                            sx={(theme) => ({
                              bgcolor:
                                index % 2 === 0
                                  ? "transparent"
                                  : alpha(theme.palette.grey[100], 0.4),
                              "&:hover": {
                                bgcolor: alpha(
                                  theme.palette.success.main,
                                  0.04,
                                ),
                              },
                            })}
                          >
                            <TableCell>
                              <Typography variant="body1" fontWeight={700}>
                                {formatDate(h.date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1">
                                {lotNames || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" fontWeight={700}>
                                {h.harvestedKgs.toLocaleString("es-ES")}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" fontWeight={600}>
                                {h.directTruckKgs.toLocaleString("es-ES")}
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
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Stack spacing={2}>
                  {harvests.map((h) => {
                    const lotNames = h.lotsIds
                      .map((id) => lotsById.get(id))
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <Card
                        key={h.id}
                        sx={(theme) => ({
                          borderRadius: 2.5,
                          border: `2px solid ${alpha(
                            theme.palette.success.main,
                            0.7,
                          )}`,
                          boxShadow: `0 2px 8px ${alpha(
                            theme.palette.success.main,
                            0.1,
                          )}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: `0 4px 16px ${alpha(
                              theme.palette.success.main,
                              0.2,
                            )}`,
                            borderColor: theme.palette.success.main,
                          },
                        })}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack spacing={1.5}>
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              color="success.dark"
                            >
                              {formatDate(h.date)}
                            </Typography>
                            <Divider />
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Lotes
                              </Typography>
                              <Typography variant="body2" mt={0.5}>
                                {lotNames || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Kgs cosechados
                              </Typography>
                              <Typography
                                variant="h6"
                                mt={0.5}
                                fontWeight={800}
                                color="success.dark"
                              >
                                {h.harvestedKgs.toLocaleString("es-ES")} kg
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Camión directo
                              </Typography>
                              <Typography
                                variant="body2"
                                mt={0.5}
                                fontWeight={600}
                              >
                                {h.directTruckKgs.toLocaleString("es-ES")} kg
                              </Typography>
                            </Box>
                            {h.notes && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  Notas
                                </Typography>
                                <Typography variant="body2" mt={0.5}>
                                  {h.notes}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            </>
          )}
        </DashboardCard>

        {/* F. Stock asociado */}
        <DashboardCard>
          <Typography variant="h6" fontWeight={700} mb={2.5} color="primary">
            Stock ({stockUnits.length})
          </Typography>
          {stockUnits.length === 0 ? (
            <Box
              sx={(theme) => ({
                py: 4,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              })}
            >
              <Typography variant="body1" color="text.secondary">
                No hay unidades de stock asociadas a este ciclo.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop table */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: "hidden",
                    boxShadow: (theme) =>
                      `0 2px 12px ${alpha(theme.palette.grey[500], 0.1)}`,
                  }}
                >
                  <Table size="small">
                    <TableHead
                      sx={(theme) => ({
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.warning.main,
                          0.1,
                        )} 0%, ${alpha(
                          theme.palette.warning.light,
                          0.1,
                        )} 100%)`,
                        "& .MuiTableCell-root": {
                          fontWeight: 700,
                          color: theme.palette.warning.dark,
                          borderBottom: `2px solid ${theme.palette.warning.main}`,
                          py: 1.5,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                      })}
                    >
                      <TableRow>
                        <TableCell>Bolsón / Unidad</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Kgs ingresados</TableCell>
                        <TableCell align="right">Kgs egresados</TableCell>
                        <TableCell align="right">Saldo actual</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockUnits.map((s, index) => (
                        <TableRow
                          key={s.id}
                          sx={(theme) => ({
                            bgcolor:
                              index % 2 === 0
                                ? "transparent"
                                : alpha(theme.palette.grey[100], 0.4),
                            "&:hover": {
                              bgcolor: alpha(theme.palette.warning.main, 0.04),
                            },
                          })}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {s.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {/*TODO: usar la funcion del backend */}
                            <StatusChip
                              status={getStockStatusLabel(s.status)}
                              options={STOCK_STATUS_OPTIONS}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600}>
                              {s.totalInKgs.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600}>
                              {s.totalOutFromHarvestKgs.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={800}
                              color="warning.dark"
                            >
                              {s.currentKgs.toLocaleString("es-ES")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Mobile cards */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Stack spacing={2}>
                  {stockUnits.map((s) => (
                    <Card
                      key={s.id}
                      sx={(theme) => ({
                        borderRadius: 2.5,
                        border: `2px solid ${alpha(
                          theme.palette.warning.main,
                          0.7,
                        )}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.warning.main,
                          0.1,
                        )}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 4px 16px ${alpha(
                            theme.palette.warning.main,
                            0.2,
                          )}`,
                          borderColor: theme.palette.warning.main,
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
                              color="warning.dark"
                            >
                              {s.name}
                            </Typography>
                            <StatusChip
                              status={getStockStatusLabel(s.status)}
                              options={STOCK_STATUS_OPTIONS}
                            />
                          </Stack>

                          <Divider />
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Ingresados
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                mt={0.5}
                              >
                                {s.totalInKgs.toLocaleString("es-ES")} kg
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Egresados
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                mt={0.5}
                              >
                                {s.totalOutFromHarvestKgs.toLocaleString(
                                  "es-ES",
                                )}{" "}
                                kg
                              </Typography>
                            </Grid>
                          </Grid>
                          <Box
                            sx={(theme) => ({
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: alpha(theme.palette.warning.main, 0.15),
                            })}
                          >
                            <Typography
                              variant="caption"
                              color="warning.dark"
                              fontWeight={700}
                            >
                              Saldo actual
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              color="warning.dark"
                              mt={0.5}
                            >
                              {s.currentKgs.toLocaleString("es-ES")} kg
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </DashboardCard>

        {/* G. Viajes de camión */}
        <DashboardCard>
          <Typography variant="h6" fontWeight={700} mb={2.5} color="primary">
            Viajes de camión ({truckTrips.length})
          </Typography>
          {truckTrips.length === 0 ? (
            <Box
              sx={(theme) => ({
                py: 4,
                textAlign: "center",
                borderRadius: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              })}
            >
              <Typography variant="body1" color="text.secondary">
                No hay viajes de camión registrados para este ciclo.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop table */}
              <Box sx={{ display: { xs: "none", md: "block" } }}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: "hidden",
                    boxShadow: (theme) =>
                      `0 2px 12px ${alpha(theme.palette.grey[500], 0.1)}`,
                  }}
                >
                  <Table size="small">
                    <TableHead
                      sx={(theme) => ({
                        background: `linear-gradient(135deg, ${alpha(
                          theme.palette.secondary.main,
                          0.08,
                        )} 0%, ${alpha(
                          theme.palette.secondary.light,
                          0.08,
                        )} 100%)`,
                        "& .MuiTableCell-root": {
                          fontWeight: 700,
                          color: theme.palette.secondary.dark,
                          borderBottom: `2px solid ${theme.palette.secondary.main}`,
                          py: 1.5,
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                      })}
                    >
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Camión</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Origen</TableCell>
                        <TableCell>Destino</TableCell>
                        <TableCell align="right">Kgs cargados</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {truckTrips.map((t, index) => {
                        const fromStock = (t.stockOriginIds ?? []).length > 0;
                        const fromHarvest =
                          (t.harvestOriginIds ?? []).length > 0;
                        const originLabel = fromStock
                          ? "Desde stock"
                          : fromHarvest
                            ? "Desde cosecha"
                            : "—";

                        return (
                          <TableRow
                            key={t.id}
                            sx={(theme) => ({
                              bgcolor:
                                index % 2 === 0
                                  ? "transparent"
                                  : alpha(theme.palette.grey[100], 0.4),
                              "&:hover": {
                                bgcolor: alpha(
                                  theme.palette.secondary.main,
                                  0.04,
                                ),
                              },
                            })}
                          >
                            <TableCell>
                              <Typography variant="body1" fontWeight={700}>
                                {formatDate(t.date)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <StatusChip
                                status={t.status}
                                options={TRIP_STATUS_OPTIONS}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1">
                                {t.truckPlate || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={originLabel}
                                variant="outlined"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.7rem",
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body1">
                                {t.destinationDetail ||
                                  t.destinationType ||
                                  "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body1"
                                fontWeight={800}
                                color="secondary.dark"
                              >
                                {t.totalKgsDestination.toLocaleString("es-ES")}
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
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <Stack spacing={2}>
                  {truckTrips.map((t) => {
                    const fromStock = (t.stockOriginIds ?? []).length > 0;
                    const fromHarvest = (t.harvestOriginIds ?? []).length > 0;
                    const originLabel = fromStock
                      ? "Desde stock"
                      : fromHarvest
                        ? "Desde cosecha"
                        : "—";

                    return (
                      <Card
                        key={t.id}
                        sx={(theme) => ({
                          borderRadius: 2.5,
                          border: `2px solid ${alpha(
                            theme.palette.secondary.main,
                            0.2,
                          )}`,
                          boxShadow: `0 2px 8px ${alpha(
                            theme.palette.secondary.main,
                            0.1,
                          )}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: `0 4px 16px ${alpha(
                              theme.palette.secondary.main,
                              0.2,
                            )}`,
                            borderColor: theme.palette.secondary.main,
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
                                color="secondary.dark"
                              >
                                {formatDate(t.date)}
                              </Typography>
                              <StatusChip
                                status={t.status}
                                options={TRIP_STATUS_OPTIONS}
                              />
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontWeight={600}
                            >
                              {t.truckPlate || "Camión sin identificar"}
                            </Typography>
                            <Divider />
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Origen
                              </Typography>
                              <Typography variant="body2" mt={0.5}>
                                {originLabel}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Destino
                              </Typography>
                              <Typography variant="body2" mt={0.5}>
                                {t.destinationType ||
                                  t.destinationDetail ||
                                  "—"}
                              </Typography>
                            </Box>
                            <Box
                              sx={(theme) => ({
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: alpha(
                                  theme.palette.secondary.main,
                                  0.15,
                                ),
                              })}
                            >
                              <Typography
                                variant="caption"
                                color="secondary.dark"
                                fontWeight={700}
                              >
                                Carga
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight={800}
                                color="secondary.dark"
                                mt={0.5}
                              >
                                {t.totalKgsDestination.toLocaleString("es-ES")}{" "}
                                kg
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            </>
          )}
        </DashboardCard>
      </Stack>
    </PageContainer>
  );
};

export default CycleDetailPageClient;
