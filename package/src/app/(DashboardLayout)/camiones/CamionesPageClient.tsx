"use client";

import * as React from "react";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import type { TruckDto } from "@/lib/baserow/trucks";
import type { TruckSelectOption } from "@/lib/baserow/truckFormOptions";
import { normalizeTruckFormToBaserowPayload } from "@/lib/trucks/formPayload";

type CamionesPageClientProps = {
  initialTrucks: TruckDto[];
  typeOptions: TruckSelectOption[];
};

type TruckFormValues = {
  Patente: string;
  Propietario: string;
  Tipo: string;
};

type SnackbarState = {
  open: boolean;
  severity: "success" | "error";
  message: string;
};

const buildDefaultFormValues = (
  typeOptions: TruckSelectOption[],
): TruckFormValues => ({
  Patente: "",
  Propietario: "",
  Tipo: typeOptions[0]?.id ?? "",
});

const buildTruckFormValues = (truck: TruckDto): TruckFormValues => ({
  Patente: truck.plate ?? "",
  Propietario: truck.owner ?? "",
  Tipo: truck.typeId ? String(truck.typeId) : "",
});

const parseErrorResponse = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const errorBody = await response.text();
  if (!errorBody) return fallback;
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed?.error) return parsed.error;
    return fallback;
  } catch {
    return errorBody || fallback;
  }
};

const getUniqueTruckPeriods = (truck: TruckDto): string[] =>
  Array.from(
    new Set(
      (truck.periodLabels || []).filter(
        (label): label is string =>
          typeof label === "string" && label.trim() !== "",
      ),
    ),
  );

const CamionesPageClient = ({
  initialTrucks,
  typeOptions,
}: CamionesPageClientProps) => {
  const buildDefaults = React.useCallback(
    () => buildDefaultFormValues(typeOptions),
    [typeOptions],
  );

  const [trucks, setTrucks] = React.useState<TruckDto[]>(initialTrucks);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [activeTruck, setActiveTruck] = React.useState<TruckDto | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<TruckFormValues>(buildDefaults());
  const [periodFilter, setPeriodFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<SnackbarState | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setTrucks(initialTrucks);
  }, [initialTrucks]);

  const sortTrucksByPlate = React.useCallback((items: TruckDto[]) => {
    return [...items].sort((a, b) =>
      a.plate.localeCompare(b.plate, "es-ES", { sensitivity: "base" }),
    );
  }, []);

  const periodOptions = React.useMemo(() => {
    const set = new Set<string>();
    trucks.forEach((truck) => {
      getUniqueTruckPeriods(truck).forEach((period) => {
        if (period) set.add(period);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-ES"));
  }, [trucks]);

  const typeFilterOptions = React.useMemo(() => {
    const provided = Array.from(
      new Set(
        typeOptions
          .map((option) => option.label?.trim())
          .filter((label): label is string => Boolean(label)),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-ES"));

    if (provided.length) return provided;

    return Array.from(
      new Set(
        trucks
          .map((truck) => truck.typeLabel?.trim())
          .filter((label): label is string => Boolean(label)),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-ES"));
  }, [trucks, typeOptions]);

  const hasTrucksWithoutType = React.useMemo(
    () => trucks.some((truck) => !truck.typeLabel),
    [trucks],
  );

  const filteredTrucks = React.useMemo(() => {
    return trucks
      .filter((truck) => {
        if (periodFilter !== "all") {
          const truckPeriods = getUniqueTruckPeriods(truck);
          if (!truckPeriods.includes(periodFilter)) {
            return false;
          }
        }

        if (typeFilter !== "all") {
          if (typeFilter === "__none__") {
            if (truck.typeLabel) return false;
          } else if ((truck.typeLabel || "").trim() !== typeFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) =>
        a.plate.localeCompare(b.plate, "es-ES", { sensitivity: "base" }),
      );
  }, [trucks, periodFilter, typeFilter]);

  const openCreateDialog = React.useCallback(() => {
    setDialogMode("create");
    setActiveTruck(null);
    setDialogInitialValues(buildDefaults());
    setDialogOpen(true);
  }, [buildDefaults]);

  const openEditDialog = React.useCallback((truck: TruckDto) => {
    setDialogMode("edit");
    setActiveTruck(truck);
    setDialogInitialValues(buildTruckFormValues(truck));
    setDialogOpen(true);
  }, []);

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode("create");
    setActiveTruck(null);
    setDialogInitialValues(buildDefaults());
    setDeleteLoading(false);
  }, [buildDefaults]);

  const handleSubmit = React.useCallback(
    async (values: Record<string, any>) => {
      const payload = normalizeTruckFormToBaserowPayload(values, {
        includeEmptyOptional: dialogMode === "edit",
      });

      if (dialogMode === "edit" && !activeTruck) {
        throw new Error("Seleccioná un camión válido");
      }

      const endpoint =
        dialogMode === "create"
          ? "/api/trucks"
          : `/api/trucks/${activeTruck?.id ?? ""}`;

      const response = await fetch(endpoint, {
        method: dialogMode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(
          response,
          "No se pudo guardar el camión",
        );
        throw new Error(message);
      }

      const result = (await response.json()) as { id?: number } | null;

      const selectedTypeKey = String(values["Tipo"] ?? "").trim();
      const selectedOption = typeOptions.find(
        (option) => option.id === selectedTypeKey,
      );

      const fallbackId =
        (dialogMode === "edit" ? activeTruck?.id : null) ??
        (result?.id ? Number(result.id) : null);

      if (!fallbackId || Number.isNaN(fallbackId)) {
        throw new Error("No se pudo resolver el ID del camión");
      }

      const baseTruck: TruckDto =
        dialogMode === "edit" && activeTruck
          ? activeTruck
          : {
              id: fallbackId,
              plate: "",
              owner: "",
              typeId: null,
              typeLabel: null,
              tripIds: [],
              tripLabels: [],
              periodLabels: [],
            };

      const nextTruck: TruckDto = {
        ...baseTruck,
        id: fallbackId,
        plate: String(values["Patente"] ?? ""),
        owner: String(values["Propietario"] ?? ""),
        typeId: selectedOption ? Number(selectedOption.id) : null,
        typeLabel: selectedOption?.label ?? null,
      };

      setTrucks((prev) => {
        if (dialogMode === "create") {
          return sortTrucksByPlate([...prev, nextTruck]);
        }
        const updated = prev.map((truck) =>
          truck.id === nextTruck.id ? nextTruck : truck,
        );
        return sortTrucksByPlate(updated);
      });
    },
    [activeTruck, dialogMode, typeOptions, sortTrucksByPlate],
  );

  const handleDelete = React.useCallback(async () => {
    if (!activeTruck) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/trucks/${activeTruck.id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const message = await parseErrorResponse(
          response,
          "No se pudo eliminar el camión",
        );
        throw new Error(message);
      }

      setSnackbar({
        open: true,
        severity: "success",
        message: "Camión eliminado correctamente",
      });
      handleDialogClose();
      setDeleteConfirmOpen(false);
      setTrucks((prev) => prev.filter((truck) => truck.id !== activeTruck.id));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el camión";
      setSnackbar({
        open: true,
        severity: "error",
        message,
      });
    } finally {
      setDeleteLoading(false);
    }
  }, [activeTruck, handleDialogClose]);

  const handleSnackbarClose = React.useCallback(() => {
    setSnackbar((prev) => (prev ? { ...prev, open: false } : prev));
  }, []);

  const dialogFields = React.useMemo<SimpleEntityDialogFieldConfig[]>(
    () => [
      {
        key: "Patente",
        label: "Patente",
        type: "text",
        required: true,
        placeholder: "AA123BB",
      },
      {
        key: "Propietario",
        label: "Propietario",
        type: "text",
        required: true,
        placeholder: "Nombre del propietario",
      },
      {
        key: "Tipo",
        label: "Tipo",
        type: "select",
        required: true,
        options: typeOptions.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      },
    ],
    [typeOptions],
  );

  const dialogSections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: "Datos del camión",
        fields: ["Patente", "Propietario", "Tipo"],
      },
    ],
    [],
  );

  const filteredCount = filteredTrucks.length;

  return (
    <PageContainer
      title="Camiones"
      description="Gestión integral de los camiones y su historial de viajes"
    >
      <Stack spacing={3}>
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
            Camiones
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Registro unificado de flota propia y de terceros, filtrado por
            periodo y tipo.
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
                <FormControl fullWidth size="small">
                  <TextField
                    label="Periodo"
                    select
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {periodOptions.map((period) => (
                      <MenuItem key={period} value={period}>
                        {period}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>

                <FormControl fullWidth size="small">
                  <TextField
                    label="Tipo"
                    select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {hasTrucksWithoutType ? (
                      <MenuItem value="__none__">Sin tipo</MenuItem>
                    ) : null}
                    {typeFilterOptions.map((label) => (
                      <MenuItem key={label} value={label}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>
              </Stack>
            </Box>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                marginBottom: "2rem",
              }}
            >
              <Box
                sx={(theme) => ({
                  px: 2,
                  py: 1.5,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                  alignSelf: "flex-start",
                })}
              >
                <Typography
                  variant="body2"
                  color="primary.dark"
                  fontWeight={600}
                >
                  {filteredCount} cami
                  {filteredCount === 1 ? "ón" : "ones"} encontrado
                  {filteredCount === 1 ? "" : "s"}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
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
                Nuevo camión
              </Button>
            </Stack>

            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 2,
                  width: "100%",
                  overflowX: "auto",
                  boxShadow: `0 2px 8px ${alpha(theme.palette.grey[500], 0.08)}`,
                })}
              >
                <Table size="small">
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
                      <TableCell>Patente</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Propietario</TableCell>

                      <TableCell>Viajes asociados</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTrucks.map((truck, index) => (
                      <TableRow
                        key={truck.id}
                        hover
                        onClick={() => openEditDialog(truck)}
                        sx={(theme) => ({
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          bgcolor:
                            index % 2 === 0
                              ? "transparent"
                              : alpha(theme.palette.grey[100], 0.5),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            transform: "scale(1.002)",
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
                        <TableCell>
                          <Typography variant="body1" fontWeight={700}>
                            {truck.plate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {truck.typeLabel ? (
                            <Chip
                              size="small"
                              label={truck.typeLabel}
                              color="primary"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {truck.owner || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {truck.tripIds.length ? (
                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              sx={{ gap: 1 }}
                            >
                              {truck.tripIds.map((tripId, index) => (
                                <Box
                                  key={`${truck.id}-trip-${tripId}`}
                                  sx={{
                                    flexBasis: {
                                      xs: "100%",
                                      sm: "calc(20% - 0.5rem)",
                                    },
                                  }}
                                >
                                  <Chip
                                    label={
                                      truck.tripLabels[index] || `#${tripId}`
                                    }
                                    size="small"
                                    variant="outlined"
                                    sx={{ width: "100%" }}
                                  />
                                </Box>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {!filteredTrucks.length && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography
                            variant="body1"
                            color="text.secondary"
                            py={3}
                          >
                            No se encontraron camiones con los filtros
                            seleccionados.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ display: { xs: "block", md: "none" } }}>
              <Stack spacing={2}>
                {filteredTrucks.length === 0 && (
                  <Paper
                    variant="outlined"
                    sx={(theme) => ({
                      p: 3,
                      textAlign: "center",
                      borderRadius: 2,
                      color: theme.palette.text.secondary,
                    })}
                  >
                    No se encontraron camiones con los filtros seleccionados.
                  </Paper>
                )}
                {filteredTrucks.map((truck) => (
                  <Card
                    key={truck.id}
                    onClick={() => openEditDialog(truck)}
                    sx={(theme) => ({
                      cursor: "pointer",
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: `0 4px 12px ${alpha(
                        theme.palette.grey[500],
                        0.12,
                      )}`,
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: `0 10px 20px ${alpha(
                          theme.palette.primary.main,
                          0.2,
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
                          <Typography variant="h6" color="primary">
                            {truck.plate}
                          </Typography>
                          {truck.typeLabel ? (
                            <Chip
                              size="small"
                              label={truck.typeLabel}
                              color="primary"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              —
                            </Typography>
                          )}
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          Propietario:{" "}
                          <Box component="span" color="text.primary">
                            {truck.owner || "—"}
                          </Box>
                        </Typography>

                        <Box
                          sx={(theme) => ({
                            height: 1,
                            background: `linear-gradient(90deg, ${theme.palette.divider} 0%, transparent 100%)`,
                          })}
                        />

                        <Stack spacing={1}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={700}
                          >
                            Periodos con viajes
                          </Typography>
                          {getUniqueTruckPeriods(truck).length ? (
                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              sx={{ gap: 0.75 }}
                            >
                              {getUniqueTruckPeriods(truck).map((period) => (
                                <Chip
                                  key={`${truck.id}-mobile-period-${period}`}
                                  label={period}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </Stack>

                        <Stack spacing={1}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={700}
                          >
                            Viajes asociados
                          </Typography>
                          {truck.tripIds.length ? (
                            <Stack flexWrap="wrap" sx={{ gap: 0.75 }}>
                              {truck.tripIds.map((tripId, index) => (
                                <Chip
                                  key={`${truck.id}-mobile-trip-${tripId}`}
                                  component={Link}
                                  href={`/viajes-de-camion/${tripId}`}
                                  onClick={(event) => event.stopPropagation()}
                                  clickable
                                  label={
                                    truck.tripLabels[index] || `#${tripId}`
                                  }
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DashboardCard>

        <SimpleEntityDialogForm
          open={dialogOpen}
          title={dialogMode === "create" ? "Nuevo camión" : "Editar camión"}
          onClose={handleDialogClose}
          onSubmit={handleSubmit}
          fields={dialogFields}
          sections={dialogSections}
          initialValues={dialogInitialValues}
          showCancel={false}
          extraActionsInline
          extraActions={
            dialogMode === "edit" ? (
              <Button
                color="error"
                variant="outlined"
                onClick={() => setDeleteConfirmOpen(true)}
                startIcon={<DeleteOutlineIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2.5,
                }}
              >
                {deleteLoading ? "Borrando..." : "Borrar camión"}
              </Button>
            ) : null
          }
        />
      </Stack>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteConfirmOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar camión</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            Esta acción es irreversible y todos los viajes relacionados quedarán
            sin camión asociado. ¿Seguro que querés borrar el camión{" "}
            <Box component="span" fontWeight={700}>
              {activeTruck?.plate ?? "seleccionado"}
            </Box>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={deleteLoading}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              void handleDelete();
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar?.open)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snackbar ? (
          <Alert
            severity={snackbar.severity}
            sx={{ width: "100%" }}
            onClose={handleSnackbarClose}
          >
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </PageContainer>
  );
};

export default CamionesPageClient;
