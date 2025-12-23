"use client";

import * as React from "react";
import {
  Box,
  Stack,
  Typography,
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
  IconButton,
  TextField,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  alpha,
  Fade,
  Collapse,
} from "@mui/material";
import {
  IconFreezeRowColumn,
  IconSeedling,
  IconTruck,
  IconTractor,
  IconMoneybag,
} from "@tabler/icons-react";
import type { PaletteColor } from "@mui/material/styles";
import type { SnackbarCloseReason } from "@mui/material/Snackbar";
import GrassIcon from "@mui/icons-material/Grass";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import DateRangeIcon from "@mui/icons-material/DateRange";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import StatusChip, {
  type PaletteKey,
  type StatusChipOption,
} from "@/app/(DashboardLayout)/components/shared/StatusChip";
import type { CycleDetailDto } from "@/lib/baserow/cycleDetail";
import type { CycleStatus } from "@/lib/baserow/cycles";

type CycleDetailPageClientProps = {
  initialDetail: CycleDetailDto;
};

const updateCycleStatus = async (
  cycleId: number,
  status: CycleStatus,
): Promise<void> => {
  const response = await fetch(`/api/cycles/${cycleId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    let message = "No se pudo actualizar el estado del ciclo";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
};

const getStockStatusLabel = (status: unknown): string => {
  if (!status) return "—";
  if (typeof status === "string") return status;

  if (
    typeof status === "object" &&
    status !== null &&
    "value" in status &&
    (status as { value?: unknown }).value
  ) {
    return String((status as { value?: unknown }).value);
  }

  return String(status);
};

const CycleDetailPageClient = ({
  initialDetail,
}: CycleDetailPageClientProps) => {
  const { cycle, lots, harvests, stockUnits, truckTrips } = initialDetail;

  const formatDate = (value?: string | null) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
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

  const lotsById = React.useMemo(() => {
    const map = new Map<number, string>();
    lots.forEach((lot) => map.set(lot.id, lot.code));
    return map;
  }, [lots]);

  type HarvestTimeRange = {
    start: string | null;
    end: string | null;
    days: number | null;
  };

  const computeHarvestTimeRange = React.useMemo<HarvestTimeRange>(() => {
    if (!harvests.length) {
      return { start: null, end: null, days: null };
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

  const [status, setStatus] = React.useState<CycleStatus>(cycle.status);
  const [statusDraft, setStatusDraft] = React.useState<CycleStatus>(
    cycle.status,
  );
  const [isEditingStatus, setIsEditingStatus] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [statusSnackbarOpen, setStatusSnackbarOpen] = React.useState(false);

  const harvestTimelineDate = computeHarvestTimeRange.start
    ? `${formatDate(computeHarvestTimeRange.start)} – ${formatDate(
        computeHarvestTimeRange.end,
      )}`
    : formatDate(cycle.estimatedHarvestDate);

  const harvestDurationLabel =
    computeHarvestTimeRange.start && computeHarvestTimeRange.days
      ? `${computeHarvestTimeRange.days} días`
      : undefined;

  const mobileTimelineItems: Array<{
    icon: React.ReactNode;
    label: string;
    dateLabel: string;
    color: PaletteKey;
    durationLabel?: string;
  }> = [
    {
      icon: <GrassIcon />,
      label: "Barbecho",
      dateLabel: formatDate(cycle.fallowStartDate),
      color: "primary",
    },
    {
      icon: <AgricultureIcon />,
      label: "Siembra",
      dateLabel: formatDate(cycle.sowingDate),
      color: "primary",
    },
  ];

  mobileTimelineItems.push(
    computeHarvestTimeRange.start
      ? {
          icon: <EventAvailableIcon />,
          label: "Cosecha",
          dateLabel: harvestTimelineDate,
          color: "success",
          durationLabel: harvestDurationLabel,
        }
      : {
          icon: <DateRangeIcon />,
          label: "Cosecha Est.",
          dateLabel: harvestTimelineDate,
          color: "warning",
        },
  );

  const handleToggleStatusEdit = () => {
    setStatusError(null);
    setStatusDraft(status);
    setIsEditingStatus((prev) => !prev);
  };

  const handleCancelStatusEdit = () => {
    setStatusDraft(status);
    setStatusError(null);
    setIsEditingStatus(false);
  };

  const handleSaveStatus = async () => {
    setStatusSaving(true);
    setStatusError(null);
    try {
      await updateCycleStatus(cycle.id, statusDraft);
      setStatus(statusDraft);
      setIsEditingStatus(false);
      setStatusSnackbarOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error al actualizar el estado";
      setStatusError(message);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleSnackbarClose = (
    _event: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason,
  ) => {
    if (reason === "clickaway") return;
    setStatusSnackbarOpen(false);
  };

  type StatCardProps = {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    color?: PaletteKey;
    gradient?: boolean;
  };

  const StatCard = ({
    icon,
    label,
    value,
    unit,
    color = "primary",
    gradient = false,
  }: StatCardProps) => (
    <Paper
      elevation={0}
      sx={(theme) => {
        const paletteColor = theme.palette[color] as PaletteColor;
        return {
          p: 3,
          borderRadius: 3,
          background: gradient
            ? `linear-gradient(135deg, ${alpha(
                paletteColor.main,
                0.08,
              )} 0%, ${alpha(paletteColor.light, 0.03)} 100%)`
            : theme.palette.background.paper,
          border: `1px solid ${alpha(paletteColor.main, 0.12)}`,
          position: "relative",
          overflow: "hidden",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: `0 12px 28px ${alpha(paletteColor.main, 0.15)}`,
            borderColor: alpha(paletteColor.main, 0.3),
          },
        };
      }}
    >
      <Stack
        spacing={2}
        direction={{ xs: "row", md: "column" }}
        alignItems={{ xs: "center", md: "self-start" }}
      >
        <Box
          sx={(theme) => {
            const paletteColor = theme.palette[color] as PaletteColor;
            return {
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(paletteColor.main, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: paletteColor.main,
            };
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: "0.7rem",
            }}
          >
            {label}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.5}>
            <Typography
              variant="h3"
              sx={(theme) => {
                const paletteColor = theme.palette[color] as PaletteColor;
                return {
                  fontWeight: 800,
                  color: paletteColor.main,
                  lineHeight: 1.2,
                };
              }}
            >
              {value}
            </Typography>
            {unit && (
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
              >
                {unit}
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );

  type TimelinePhaseProps = {
    icon: React.ReactNode;
    title: string;
    date: string;
    color: PaletteKey;
    isLast?: boolean;
    durationLabel?: string;
  };

  const TimelinePhase = ({
    icon,
    title,
    date,
    color,
    isLast = false,
    durationLabel,
  }: TimelinePhaseProps) => (
    <Box sx={{ position: "relative", flex: 1 }}>
      <Stack alignItems="center" spacing={1.5}>
        <Box
          sx={(theme) => {
            const paletteColor = theme.palette[color] as PaletteColor;
            return {
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${paletteColor.main} 0%, ${paletteColor.dark} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              position: "relative",
              zIndex: 2,
              boxShadow: `0 8px 24px ${alpha(paletteColor.main, 0.35)}`,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: `0 12px 32px ${alpha(paletteColor.main, 0.45)}`,
              },
            };
          }}
        >
          {icon}
        </Box>
        <Box textAlign="center">
          <Typography
            variant="caption"
            sx={(theme) => {
              const paletteColor = theme.palette[color] as PaletteColor;
              return {
                color: paletteColor.main,
                fontWeight: 800,
                textTransform: "uppercase",
                fontSize: "0.7rem",
                letterSpacing: "0.5px",
              };
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color="text.primary"
            mt={0.5}
          >
            {date}
          </Typography>
          {durationLabel && (
            <Chip
              label={durationLabel}
              sx={(theme) => ({
                mt: "1rem",
                fontWeight: 600,
                borderRadius: "8px",
                paddingX: "80px",
              })}
            />
          )}
        </Box>
      </Stack>
    </Box>
  );

  return (
    <PageContainer
      title={`Ciclo ${cycle.cycleId}`}
      description={`Detalle del ciclo ${cycle.cycleId}`}
    >
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
        {/* Hero Header */}
        <Box
          sx={(theme) => ({
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.05,
            )} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
            borderBottom: `1px solid ${theme.palette.divider}`,
            py: { xs: 4, md: 6 },
            px: { xs: 2, md: 4 },
          })}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            maxWidth="1400px"
            mx="auto"
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 1,
                }}
              >
                {cycle.cycleId}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                flexWrap="wrap"
                mt={3}
              >
                <Chip
                  label={`Periodo ${cycle.period}`}
                  sx={{
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: "primary.dark",
                    fontWeight: 700,
                    borderRadius: "8px",
                  }}
                />
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {cycle.field}
                </Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StatusChip
                status={status}
                options={CYCLE_STATUS_OPTIONS}
                sx={{
                  height: 35,
                  borderRadius: "0.8rem",
                  px: 2,
                  py: 0,
                  fontSize: "0.875rem",
                }}
              />
              <IconButton
                size="medium"
                onClick={handleToggleStatusEdit}
                disabled={statusSaving}
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Collapse in={isEditingStatus}>
            <Box
              maxWidth="1400px"
              mx="auto"
              mt={3}
              sx={{
                display: "flex",
                justifyContent: { xs: "stretch", md: "flex-end" },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  width: { xs: "100%", md: 420 },
                }}
              >
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Estado del ciclo"
                    size="small"
                    fullWidth
                    value={statusDraft}
                    onChange={(e) =>
                      setStatusDraft(e.target.value as CycleStatus)
                    }
                    disabled={statusSaving}
                    sx={{ maxWidth: 300 }}
                  >
                    {CYCLE_STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleSaveStatus}
                      disabled={statusSaving}
                      sx={{ borderRadius: 2 }}
                    >
                      {statusSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancelStatusEdit}
                      disabled={statusSaving}
                      sx={{ borderRadius: 2 }}
                    >
                      Cancelar
                    </Button>
                  </Stack>
                  {statusError && (
                    <Alert
                      severity="error"
                      onClose={() => setStatusError(null)}
                    >
                      {statusError}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Collapse>
        </Box>

        <Box maxWidth="1400px" mx="auto" px={{ xs: 2, md: 4 }} mt={4}>
          <Stack spacing={6}>
            {/* Timeline Section */}
            <Fade in timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 5 },
                  borderRadius: 4,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  background: (theme) => theme.palette.background.paper,
                }}
              >
                {/* Desktop Timeline */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Box sx={{ position: "relative", px: 4 }}>
                    <Box
                      sx={(theme) => ({
                        position: "absolute",
                        top: "36px",
                        left: "10%",
                        right: "10%",
                        height: "3px",
                        background: `linear-gradient(to right, ${alpha(
                          theme.palette.primary.main,
                          0.2,
                        )}, ${theme.palette.primary.main}, ${alpha(
                          theme.palette.success.main,
                          0.8,
                        )})`,
                        borderRadius: "8px",
                        zIndex: 0,
                      })}
                    />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ position: "relative", zIndex: 1 }}
                    >
                      <TimelinePhase
                        icon={<GrassIcon sx={{ fontSize: 32 }} />}
                        title="Barbecho"
                        date={formatDate(cycle.fallowStartDate)}
                        color="primary"
                      />
                      <TimelinePhase
                        icon={<IconSeedling />}
                        title="Siembra"
                        date={formatDate(cycle.sowingDate)}
                        color="primary"
                      />
                      <TimelinePhase
                        icon={
                          computeHarvestTimeRange.start ? (
                            <EventAvailableIcon sx={{ fontSize: 32 }} />
                          ) : (
                            <DateRangeIcon sx={{ fontSize: 32 }} />
                          )
                        }
                        title={
                          computeHarvestTimeRange.start
                            ? "Cosecha"
                            : "Cosecha Est."
                        }
                        date={harvestTimelineDate}
                        color={
                          computeHarvestTimeRange.start ? "success" : "warning"
                        }
                        durationLabel={harvestDurationLabel}
                        isLast
                      />
                    </Stack>
                  </Box>
                </Box>

                {/* Mobile Timeline */}
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  <Stack spacing={3}>
                    {mobileTimelineItems.map((item, idx) => (
                      <Stack
                        key={`${item.label}-${idx}`}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                      >
                        <Box
                          sx={(theme) => {
                            const paletteColor = theme.palette[
                              item.color
                            ] as PaletteColor;
                            return {
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              background: `linear-gradient(135deg, ${paletteColor.main} 0%, ${paletteColor.dark} 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              flexShrink: 0,
                              boxShadow: `0 4px 12px ${alpha(paletteColor.main, 0.3)}`,
                            };
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: `${item.color}.dark`,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              fontSize: "0.7rem",
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {item.dateLabel}
                          </Typography>
                          {item.durationLabel && (
                            <Chip
                              size="small"
                              label={item.durationLabel}
                              sx={{
                                mt: 0.5,
                                fontWeight: 600,
                                borderRadius: "8px",
                              }}
                            />
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Fade>

            {/* Stats Overview */}
            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                mb={3}
                color="text.primary"
              >
                Resumen General
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, 1fr)",
                    lg: "repeat(5, 1fr)",
                  },
                  gap: 3,
                }}
              >
                <StatCard
                  icon={<IconFreezeRowColumn />}
                  label="Superficie"
                  value={cycle.areaHa.toLocaleString("es-ES")}
                  unit="ha"
                  color="primary"
                  gradient
                />
                <StatCard
                  icon={<IconTractor />}
                  label="Rendimiento"
                  value={`${cycle.actualYield.toFixed(1)} / ${cycle.expectedYield.toFixed(1)}`}
                  unit="qq/ha"
                  color="info"
                  gradient
                />
                <StatCard
                  icon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
                  label="Cosechado"
                  value={cycle.totalKgs.toLocaleString("es-ES")}
                  unit="kg"
                  color="success"
                  gradient
                />
                <StatCard
                  icon={<IconMoneybag />}
                  label="En Stock"
                  value={cycle.stockKgs.toLocaleString("es-ES")}
                  unit="kg"
                  color="warning"
                  gradient
                />
                <StatCard
                  icon={<IconTruck />}
                  label="En camión"
                  value={cycle.truckKgs}
                  unit="kg"
                  color="secondary"
                  gradient
                />
              </Box>
            </Box>

            {/* Lots Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <IconFreezeRowColumn fontSize="40px" color="#3A3184" />
                <Typography
                  variant="h5"
                  fontWeight={800}
                  mb={3}
                  color="text.primary"
                >
                  Lotes ({lots.length})
                </Typography>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* Desktop Table */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Table>
                    <TableHead
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      })}
                    >
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            color: "primary.main",
                            borderBottom: "2px solid",
                            borderColor: "primary.main",
                          }}
                        >
                          Lote
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: "primary.main",
                            borderBottom: "2px solid",
                            borderColor: "primary.main",
                          }}
                        >
                          Superficie (ha)
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lots.map((lot, index) => (
                        <TableRow
                          key={lot.id}
                          sx={{
                            "&:hover": {
                              bgcolor: (theme) =>
                                alpha(theme.palette.primary.main, 0.02),
                            },
                          }}
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
                </Box>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: "block", md: "none" }, p: 2 }}>
                  <Stack spacing={2}>
                    {lots.map((lot) => (
                      <Card
                        key={lot.id}
                        sx={{
                          borderRadius: 2,
                          border: (theme) =>
                            `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <CardContent>
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
                            <Typography variant="h6" fontWeight={700}>
                              {lot.areaHa.toLocaleString("es-ES")} ha
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Box>

            {/* Harvests Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 32 }} />
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  Cosechas ({harvests.length})
                </Typography>
              </Stack>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: (theme) =>
                    `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                }}
              >
                {/* Desktop Table */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Table>
                    <TableHead
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                      })}
                    >
                      <TableRow>
                        {[
                          "Fecha",
                          "Lotes",
                          "Kgs cosechados",
                          "Kgs camión directo",
                        ].map((header) => (
                          <TableCell
                            key={header}
                            align={header.includes("Kgs") ? "right" : "left"}
                            sx={{
                              fontWeight: 700,
                              color: "success.dark",
                              borderBottom: "2px solid",
                              borderColor: "success.main",
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {harvests.map((h) => {
                        const lotNames = h.lotsIds
                          .map((id) => lotsById.get(id))
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <TableRow
                            key={h.id}
                            sx={{
                              "&:hover": {
                                bgcolor: (theme) =>
                                  alpha(theme.palette.success.main, 0.02),
                              },
                            }}
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
                </Box>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: "block", md: "none" }, p: 2 }}>
                  <Stack spacing={2}>
                    {harvests.map((h) => {
                      const lotNames = h.lotsIds
                        .map((id) => lotsById.get(id))
                        .filter(Boolean)
                        .join(", ");
                      return (
                        <Card
                          key={h.id}
                          sx={{
                            borderRadius: 2,
                            border: (theme) =>
                              `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1.5}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                color="success.dark"
                              >
                                {h.harvestId}
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
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                paddingRight="20px"
                              >
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
                                    variant="h6"
                                    mt={0.5}
                                    fontWeight={600}
                                  >
                                    {h.directTruckKgs.toLocaleString("es-ES")}{" "}
                                    kg
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </Paper>
            </Box>

            {/* Stock Units Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <IconMoneybag fontSize="40px" color="#F0C05A" />
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  Stock ({stockUnits.length})
                </Typography>
              </Stack>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: (theme) =>
                    `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                {/* Desktop Table */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Table>
                    <TableHead
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                      })}
                    >
                      <TableRow>
                        {[
                          "Bolsón / Unidad",
                          "Estado",
                          "Kgs ingresados",
                          "Kgs egresados",
                          "Saldo actual",
                        ].map((header) => (
                          <TableCell
                            key={header}
                            align={
                              header.includes("Kgs") || header.includes("Saldo")
                                ? "right"
                                : "left"
                            }
                            sx={{
                              fontWeight: 700,
                              color: "warning.dark",
                              borderBottom: "2px solid",
                              borderColor: "warning.main",
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockUnits.map((s) => (
                        <TableRow
                          key={s.id}
                          sx={{
                            "&:hover": {
                              bgcolor: (theme) =>
                                alpha(theme.palette.warning.main, 0.02),
                            },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {s.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
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
                </Box>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: "block", md: "none" }, p: 2 }}>
                  <Stack spacing={2}>
                    {stockUnits.map((s) => (
                      <Card
                        key={s.id}
                        sx={{
                          borderRadius: 2,
                          border: (theme) =>
                            `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                        }}
                      >
                        <CardContent>
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
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              paddingRight="50px"
                              paddingBottom="20px"
                            >
                              <Box>
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
                              </Box>
                              <Box>
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
                              </Box>
                            </Stack>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={700}
                            >
                              Saldo actual
                            </Typography>
                            <Typography
                              variant="h6"
                              marginTop="0px"
                              lineHeight="0.7rem"
                              fontWeight={800}
                              color="warning.dark"
                            >
                              {s.currentKgs.toLocaleString("es-ES")} kg
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Box>

            {/* Truck Trips Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <LocalShippingIcon
                  sx={{ color: "secondary.main", fontSize: 32 }}
                />
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  Viajes de camión ({truckTrips.length})
                </Typography>
              </Stack>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: (theme) =>
                    `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                }}
              >
                {/* Desktop Table */}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Table>
                    <TableHead
                      sx={(theme) => ({
                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                      })}
                    >
                      <TableRow>
                        {[
                          "Fecha",
                          "Estado",
                          "Camión",
                          "Origen",
                          "Destino",
                          "Kgs cargados",
                        ].map((header) => (
                          <TableCell
                            key={header}
                            align={header.includes("Kgs") ? "right" : "left"}
                            sx={{
                              fontWeight: 700,
                              color: "secondary.dark",
                              borderBottom: "2px solid",
                              borderColor: "secondary.main",
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {truckTrips.map((t) => {
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
                            sx={{
                              "&:hover": {
                                bgcolor: (theme) =>
                                  alpha(theme.palette.secondary.main, 0.02),
                              },
                            }}
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
                                  borderRadius: "8px",
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
                </Box>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: "block", md: "none" }, p: 2 }}>
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
                          sx={{
                            borderRadius: 2,
                            border: (theme) =>
                              `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                          }}
                        >
                          <CardContent>
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
                                  {t.tripId}
                                </Typography>
                                <StatusChip
                                  status={t.status}
                                  options={TRIP_STATUS_OPTIONS}
                                />
                              </Stack>
                              <Chip
                                variant="outlined"
                                size="small"
                                label={t.truckPlate || "Camión sin identificar"}
                                sx={{ alignSelf: "flex-start" }}
                              ></Chip>
                              <Divider />
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                paddingRight="50px"
                                paddingBottom="20px"
                              >
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
                              </Stack>

                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                Carga
                              </Typography>
                              <Typography
                                variant="h6"
                                fontWeight={800}
                                color="secondary.dark"
                                lineHeight="0.8rem"
                              >
                                {t.totalKgsDestination.toLocaleString("es-ES")}{" "}
                                kg
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              </Paper>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Snackbar
        open={statusSnackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={(event) => handleSnackbarClose(event)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Estado del ciclo actualizado correctamente
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default CycleDetailPageClient;
