"use client";

import * as React from "react";
import {
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
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import StockDialog, {
  type Option,
  type StockDialogMode,
  type StockFormValues,
} from "@/app/(DashboardLayout)/components/stock/StockDialog";
import StatusChip, {
  StatusChipOption,
} from "@/app/(DashboardLayout)/components/shared/StatusChip";
import CropChip from "@/app/(DashboardLayout)/components/shared/CropChip";
import type { StockDto } from "@/lib/baserow/stocks";

/* --------- Props --------- */

type StockPageClientProps = {
  initialStock: StockDto[];
  unitTypeOptions: Option[];
  statusOptions: Option[];
};

/* --------- Helpers puros --------- */

const formatDateParts = (
  value: string | null,
): { date: string; time: string } => {
  if (!value) return { date: "—", time: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value ?? "—", time: "" };

  return {
    date: date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }),
    time: "",
  };
};

const STOCK_STATUS_OPTIONS: StatusChipOption[] = [
  { value: "Nuevo", color: "info" },
  { value: "Parcial", color: "warning" },
  { value: "Completo", color: "success" },
  { value: "Vacío", color: "default" },
];

const formatKgs = (value: number): string =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 0 });

const getTodayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getDefaultStockFormValues = (params: {
  unitTypeOptions: Option[];
  statusOptions: Option[];
}): StockFormValues => {
  const { unitTypeOptions, statusOptions } = params;

  return {
    "Tipo unidad": unitTypeOptions[0]?.id ?? "",
    Campo: "",
    "Ciclo de siembra": "",
    Cultivo: "",
    "Fecha de creación": getTodayDateString(),
    Estado: statusOptions[0]?.id ?? "",
    Notas: "",
    ID: "",
    "Kgs actuales": "—",
    "Total kgs ingresados": "—",
    "Total kgs egresados": "—",
    "Cosechas asociadas": [],
    "Viajes de camión desde stock": [],
  };
};

const formatReadonlyKg = (value: number): string => `${formatKgs(value)} kg`;

const buildChipValues = (items?: string[]): string[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((label) => (typeof label === "string" ? label.trim() : ""))
    .filter((label) => Boolean(label));
};

const buildStockInitialValues = (stock: StockDto): StockFormValues => {
  const firstCycleId = stock.cycleIds?.[0] ?? "";
  const createdDate = stock.createdAt
    ? stock.createdAt.slice(0, 10)
    : getTodayDateString();

  return {
    "Tipo unidad": stock.unitTypeId ?? "",
    Campo: stock.fieldId ?? "",
    "Ciclo de siembra": firstCycleId,
    Cultivo: stock.crop ?? "",
    "Fecha de creación": createdDate,
    Estado: stock.statusId ?? "",
    Notas: stock.notes ?? "",
    ID: stock.name || `#${stock.id}`,
    "Kgs actuales": formatReadonlyKg(stock.currentKgs ?? 0),
    "Total kgs ingresados": formatReadonlyKg(stock.totalInKgs ?? 0),
    "Total kgs egresados": formatReadonlyKg(stock.totalOutFromHarvestKgs ?? 0),
    "Cosechas asociadas": buildChipValues(stock.originHarvestsLabels),
    "Viajes de camión desde stock": buildChipValues(stock.truckTripLabels),
  };
};

/* --------- Componente principal --------- */

const StockPageClient = ({
  initialStock,
  unitTypeOptions,
  statusOptions,
}: StockPageClientProps) => {
  const buildDefaultFormValues = React.useCallback(
    () =>
      getDefaultStockFormValues({
        unitTypeOptions,
        statusOptions,
      }),
    [statusOptions, unitTypeOptions],
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<StockDialogMode>("create");
  const [activeStock, setActiveStock] = React.useState<StockDto | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<StockFormValues>(buildDefaultFormValues);
  const [fieldFilter, setFieldFilter] = React.useState<string>("all");
  const [cycleFilter, setCycleFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const uniqueFields = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialStock
            .map((s) => s.field)
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort(),
    [initialStock],
  );

  const uniqueCycles = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialStock
            .flatMap((s) => s.cycleLabels || [])
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort(),
    [initialStock],
  );

  const uniqueStatuses = React.useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          initialStock
            .map((s) => s.status)
            .filter((v): v is string => Boolean(v)),
        ),
      ).sort(),
    [initialStock],
  );

  // Stock filtrado
  const filteredStock = React.useMemo<StockDto[]>(() => {
    return initialStock
      .filter((s) => {
        if (fieldFilter !== "all" && s.field !== fieldFilter) return false;
        if (cycleFilter !== "all") {
          if (!s.cycleLabels.includes(cycleFilter)) return false;
        }
        if (statusFilter !== "all") {
          if (!s.status || s.status !== statusFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [initialStock, fieldFilter, cycleFilter, statusFilter]);

  const filteredTotals = React.useMemo(
    () =>
      filteredStock.reduce(
        (acc, stock) => {
          acc.inKgs += stock.totalInKgs;
          acc.outKgs += stock.totalOutFromHarvestKgs;
          acc.balanceKgs += stock.currentKgs;
          return acc;
        },
        { inKgs: 0, outKgs: 0, balanceKgs: 0 },
      ),
    [filteredStock],
  );

  const openEditDialog = React.useCallback((stock: StockDto) => {
    setDialogMode("edit");
    setActiveStock(stock);
    setDialogInitialValues(buildStockInitialValues(stock));
    setDialogOpen(true);
  }, []);

  const handleOpenCreateDialog = React.useCallback(() => {
    setDialogMode("create");
    setActiveStock(null);
    setDialogInitialValues(buildDefaultFormValues());
    setDialogOpen(true);
  }, [buildDefaultFormValues]);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode("create");
    setActiveStock(null);
    setDialogInitialValues(buildDefaultFormValues());
  }, [buildDefaultFormValues]);

  return (
    <PageContainer
      title="Stock"
      description="Logística y control del almacenaje de la cosecha"
    >
      <Stack spacing={3}>
        {/* Encabezado */}
        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              background: "linear-gradient(135deg, #3A3184 0%, #6962A2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
              mb: 1,
            }}
          >
            Stock
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: "800px" }}
          >
            Vista consolidada del stock en campo: bolsones, ciclos de siembra
            asociados y movimientos de entrada/salida.
          </Typography>
        </Box>

        {/* Filtros y resumen */}
        <DashboardCard>
          <Stack spacing={3}>
            {/* Filtros */}
            <Box
              sx={(theme) => ({
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.03,
                )} 0%, ${alpha(theme.palette.primary.light, 0.03)} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
              })}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ alignItems: { xs: "stretch", md: "center" } }}
              >
                {/* Campo */}
                <FormControl fullWidth size="small">
                  <TextField
                    label="Campo"
                    select
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueFields.map((field) => (
                      <MenuItem key={field} value={field}>
                        {field}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>

                {/* Ciclo */}
                <FormControl fullWidth size="small">
                  <TextField
                    label="Ciclo"
                    select
                    value={cycleFilter}
                    onChange={(e) => setCycleFilter(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueCycles.map((id) => (
                      <MenuItem key={id} value={String(id)}>
                        {`${id}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>

                {/* Estado */}
                <FormControl fullWidth size="small">
                  <TextField
                    label="Estado"
                    select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueStatuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
              </Stack>
            </Box>

            {/* Resumen + acciones */}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                mb: 2,
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
                    0.12,
                  )}`,
                })}
              >
                <Typography
                  variant="body2"
                  color="primary.dark"
                  fontWeight={600}
                >
                  {filteredStock.length} unidad
                  {filteredStock.length !== 1 ? "es" : ""}
                  {filteredStock.length !== 1 ? "" : ""} encontrada
                  {filteredStock.length !== 1 ? "s" : ""}
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={2}
                sx={{
                  width: { xs: "100%", md: "auto" },
                  justifyContent: { xs: "space-between", md: "flex-end" },
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateDialog}
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    boxShadow: (theme) =>
                      `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                    "&:hover": {
                      boxShadow: (theme) =>
                        `0 6px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                    },
                  }}
                >
                  Nuevo Stock
                </Button>
                {/* <Button
                  variant="outlined"
                  sx={{
                    flexGrow: { xs: 1, md: 0 },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Exportar CSV
                </Button> */}
              </Stack>
            </Stack>

            {/* Tabla Desktop */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 2,
                  width: "100%",
                  overflowX: "auto",
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.grey[500],
                    0.08,
                  )}`,
                })}
              >
                <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead
                    sx={(theme) => ({
                      background: `linear-gradient(135deg, ${alpha(
                        theme.palette.primary.main,
                        0.06,
                      )} 0%, ${alpha(theme.palette.primary.light, 0.06)} 100%)`,
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
                      <TableCell>ID Stock</TableCell>
                      <TableCell>Tipo / Cultivo</TableCell>
                      <TableCell>Fecha creación</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell>Ciclo </TableCell>
                      <TableCell>Cosechas asociadas</TableCell>
                      <TableCell>Viajes camión</TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.15,
                          )}`,
                        })}
                      />
                      <TableCell align="right">Kgs ingresados</TableCell>
                      <TableCell align="right">Kgs egresados</TableCell>
                      <TableCell align="right">Saldo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStock.map((s, index) => {
                      const { date } = formatDateParts(s.createdAt);
                      const firstCycleId = s.cycleIds[0];
                      const firstCycleLabel = s.cycleLabels[0];

                      return (
                        <TableRow
                          key={s.id}
                          hover
                          onClick={() => {
                            void openEditDialog(s);
                          }}
                          sx={(theme) => ({
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            bgcolor:
                              index % 2 === 0
                                ? "transparent"
                                : alpha(theme.palette.grey[100], 0.4),
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.04),
                              transform: "scale(1.005)",
                              boxShadow: `0 2px 8px ${alpha(
                                theme.palette.primary.main,
                                0.1,
                              )}`,
                            },
                            "& .MuiTableCell-root": {
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              py: 1.5,
                            },
                          })}
                        >
                          {/* ID Stock */}
                          <TableCell>
                            <Typography variant="body1" fontWeight={600}>
                              {s.name}
                            </Typography>
                          </TableCell>

                          {/* Tipo */}
                          <TableCell>
                            <Stack spacing={0.7} alignItems="center">
                              <Chip
                                size="small"
                                label={s.unitType || "—"}
                                variant="outlined"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "body1",
                                  textTransform: "capitalize",
                                }}
                              />
                              {s.crop ? <CropChip crop={s.crop} /> : null}
                            </Stack>
                          </TableCell>

                          {/* Fecha creación */}
                          <TableCell>
                            <Typography variant="body1" fontWeight={700}>
                              {date}
                            </Typography>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                            <StatusChip
                              status={s.status || null}
                              options={STOCK_STATUS_OPTIONS}
                            />
                          </TableCell>

                          {/* Divider */}
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08,
                              )}`,
                            })}
                          />

                          {/* Ciclo */}
                          <TableCell>
                            {firstCycleId ? (
                              <Typography
                                component={Link}
                                href={`/ciclos/${firstCycleId}`}
                                onClick={(event) => event.stopPropagation()}
                                sx={(theme) => ({
                                  fontSize: "body2",
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  textDecoration: "none",
                                  display: "block",
                                  mb: 0.5,
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                })}
                              >
                                {`${firstCycleLabel}`}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body1"
                                color="text.secondary"
                              >
                                Sin ciclo
                              </Typography>
                            )}
                          </TableCell>

                          {/* Cosechas asociadas */}
                          <TableCell>
                            {s.originHarvestIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {s.originHarvestIds.map((hid, i) => (
                                  <Chip
                                    key={hid}
                                    component={Link}
                                    href={`/cosechas/${hid}`}
                                    onClick={(event: React.MouseEvent) =>
                                      event.stopPropagation()
                                    }
                                    clickable
                                    size="small"
                                    variant="outlined"
                                    label={`${s.originHarvestsLabels[i]}`}
                                    sx={{
                                      fontSize: "body2",
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
                          </TableCell>

                          {/* Viajes camión asociados */}
                          <TableCell>
                            {s.truckTripIds.length ? (
                              <Stack spacing={0.5} flexWrap="wrap">
                                {s.truckTripIds.map((tid, i) => (
                                  <Chip
                                    key={tid}
                                    component={Link}
                                    variant="outlined"
                                    href={`/viajes-de-camion/${tid}`}
                                    onClick={(event: React.MouseEvent) =>
                                      event.stopPropagation()
                                    }
                                    clickable
                                    size="small"
                                    label={`${s.truckTripLabels[i]}`}
                                    sx={{
                                      fontSize: "body2",
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
                          </TableCell>

                          {/* Divider */}
                          <TableCell
                            sx={(theme) => ({
                              borderLeft: `2px solid ${alpha(
                                theme.palette.primary.main,
                                0.08,
                              )}`,
                            })}
                          />

                          {/* Kgs ingresados */}
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={700}
                              color="primary"
                            >
                              {formatKgs(s.totalInKgs)}
                            </Typography>
                          </TableCell>

                          {/* Kgs egresados */}
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              color="text.primary"
                            >
                              {formatKgs(s.totalOutFromHarvestKgs)}
                            </Typography>
                          </TableCell>

                          {/* Saldo */}
                          <TableCell align="right">
                            <Typography
                              variant="body1"
                              fontWeight={800}
                              color={
                                s.currentKgs === 0
                                  ? "text.secondary"
                                  : "success"
                              }
                            >
                              {formatKgs(s.currentKgs)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    <TableRow
                      sx={(theme) => ({
                        background: theme.palette.grey.A100,
                        "& .MuiTableCell-root": {
                          borderTop: `2px solid ${theme.palette.grey}`,
                          fontWeight: 800,
                          color: theme.palette.primary.main,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          py: 1.5,
                          fontSize: "1rem",
                        },
                      })}
                    >
                      <TableCell
                        colSpan={8}
                        align="right"
                        sx={() => ({ paddingRight: "2.5rem" })}
                      >
                        Total
                      </TableCell>
                      <TableCell
                        sx={(theme) => ({
                          borderLeft: `2px solid ${alpha(
                            theme.palette.primary.main,
                            0.08,
                          )}`,
                        })}
                      />
                      <TableCell align="right">
                        {formatKgs(filteredTotals.inKgs)}
                      </TableCell>
                      <TableCell align="right">
                        {formatKgs(filteredTotals.outKgs)}
                      </TableCell>
                      <TableCell align="right">
                        {formatKgs(filteredTotals.balanceKgs)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile cards */}
            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <Stack spacing={2}>
                <Card
                  sx={(theme) => ({
                    borderRadius: 2,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.2,
                    )}`,
                    background: `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      0.05,
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
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      marginRight={3}
                    >
                      <Stack spacing={2}>
                        <Stack spacing={0.3}>
                          <Typography variant="caption" color="text.secondary">
                            ↑ Ingresados
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {formatKgs(filteredTotals.inKgs)} kg
                          </Typography>
                        </Stack>
                        <Stack spacing={0.3}>
                          <Typography variant="caption" color="text.secondary">
                            Saldo
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={800}
                            color={
                              filteredTotals.balanceKgs === 0
                                ? "text.secondary"
                                : "success.dark"
                            }
                          >
                            {formatKgs(filteredTotals.balanceKgs)} kg
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack spacing={0.3}>
                        <Typography variant="caption" color="text.secondary">
                          ↓ Egresados
                        </Typography>
                        <Typography variant="body1" fontWeight={700}>
                          {formatKgs(filteredTotals.outKgs)} kg
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {filteredStock.map((s) => {
                  const { date } = formatDateParts(s.createdAt);
                  const firstCycleId = s.cycleIds[0];
                  const firstCycleLabel = s.cycleLabels[0];

                  return (
                    <Card
                      key={s.id}
                      onClick={() => {
                        void openEditDialog(s);
                      }}
                      sx={(theme) => ({
                        cursor: "pointer",
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(
                          theme.palette.grey[500],
                          0.08,
                        )}`,
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: `0 8px 24px ${alpha(
                            theme.palette.primary.main,
                            0.15,
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
                              {s.name}
                            </Typography>
                            <StatusChip
                              status={s.status || null}
                              options={STOCK_STATUS_OPTIONS}
                            />
                          </Stack>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                          >
                            <Chip
                              size="small"
                              label={s.unitType || "—"}
                              variant="outlined"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                textTransform: "capitalize",
                              }}
                            />
                            {s.crop ? <CropChip crop={s.crop} /> : null}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontWeight={600}
                              paddingInlineStart="5px"
                            >
                              {date}
                            </Typography>
                          </Stack>

                          <Box
                            sx={(theme) => ({
                              height: "1px",
                              background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                            })}
                          />

                          {/* Ciclo + cultivo */}
                          <Stack spacing={0.5}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={700}
                            >
                              Ciclo
                            </Typography>
                            {firstCycleId ? (
                              <Typography
                                component={Link}
                                href={`/ciclos/${firstCycleId}`}
                                onClick={(event) => event.stopPropagation()}
                                sx={(theme) => ({
                                  fontSize: "0.9rem",
                                  fontWeight: 700,
                                  color: theme.palette.primary.main,
                                  textDecoration: "none",
                                  "&:hover": { textDecoration: "underline" },
                                })}
                              >
                                {`${firstCycleLabel}`}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Sin ciclo asociado
                              </Typography>
                            )}
                          </Stack>

                          {/* Kgs */}
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            marginRight={3}
                          >
                            <Stack spacing={2}>
                              <Stack spacing={0.2}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  ↑ Ingresados
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatKgs(s.totalInKgs)} kg
                                </Typography>
                              </Stack>
                              <Stack spacing={0.2}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={700}
                                >
                                  Saldo
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  color={
                                    s.currentKgs === 0
                                      ? "text.secondary"
                                      : "success.dark"
                                  }
                                >
                                  {formatKgs(s.currentKgs)} kg
                                </Typography>
                              </Stack>
                            </Stack>
                            <Stack spacing={0.2}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                              >
                                ↓ Egresados
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatKgs(s.totalOutFromHarvestKgs)} kg
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

        <StockDialog
          open={dialogOpen}
          mode={dialogMode}
          activeStock={activeStock}
          initialValues={dialogInitialValues}
          unitTypeOptions={unitTypeOptions}
          statusOptions={statusOptions}
          onClose={handleDialogClose}
        />
      </Stack>
    </PageContainer>
  );
};

export default StockPageClient;
