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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import CropChip from "@/app/(DashboardLayout)/components/shared/CropChip";
import SimpleEntityDialogForm, {
  type SimpleEntityDialogFieldConfig,
  type SimpleEntityDialogSection,
} from "@/components/forms/SimpleEntityDialogForm";
import type { ProviderDto } from "@/lib/baserow/providers";

type ProveedoresPageClientProps = {
  initialProviders: ProviderDto[];
  admitsOptions: Array<{ id: string; label: string }>;
};

type SnackbarState = {
  open: boolean;
  severity: "success" | "error" | "info";
  message: string;
};

type ProviderFormValues = {
  Name: string;
  Admite: string[];
  Notes: string;
};

const formatKgs = (value: number): string =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 0 });

const deleteProvider = async (id: number): Promise<void> => {
  const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
  if (res.status === 204) return;
  const text = await res.text();
  throw new Error(text || "Error al borrar el proveedor");
};

const ProveedoresPageClient = ({
  initialProviders,
  admitsOptions,
}: ProveedoresPageClientProps) => {
  const [providers, setProviders] =
    React.useState<ProviderDto[]>(initialProviders);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">(
    "create",
  );
  const [activeProvider, setActiveProvider] =
    React.useState<ProviderDto | null>(null);
  const [dialogInitialValues, setDialogInitialValues] =
    React.useState<ProviderFormValues>(() => ({
      Name: "",
      Admite: [],
      Notes: "",
    }));
  const [periodFilter, setPeriodFilter] = React.useState<string>("all");
  const [admitFilter, setAdmitFilter] = React.useState<string>("all");
  const [snackbar, setSnackbar] = React.useState<SnackbarState | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setProviders(initialProviders);
  }, [initialProviders]);

  const uniquePeriods = React.useMemo(() => {
    const set = new Set<string>();
    providers.forEach((provider) => {
      provider.periodLabels.forEach((label) => {
        if (label) set.add(label);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-ES"));
  }, [providers]);

  const uniqueAdmits = React.useMemo(() => {
    const provided = Array.from(
      new Set(admitsOptions.map((option) => option.label).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "es-ES"));

    if (provided.length) return provided;

    return Array.from(
      new Set(
        providers
          .flatMap((provider) => provider.admitsLabels)
          .map((label) => label.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "es-ES"));
  }, [admitsOptions, providers]);

  const filteredProviders = React.useMemo(() => {
    return providers
      .filter((provider) => {
        if (
          periodFilter !== "all" &&
          !provider.periodLabels.includes(periodFilter)
        ) {
          return false;
        }

        if (
          admitFilter !== "all" &&
          !provider.admitsLabels.includes(admitFilter)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es-ES"));
  }, [providers, periodFilter, admitFilter]);

  const buildDefaultFormValues = React.useCallback(
    (): ProviderFormValues => ({
      Name: "",
      Admite: [],
      Notes: "",
    }),
    [],
  );

  const buildProviderFormValues = React.useCallback(
    (provider: ProviderDto): ProviderFormValues => ({
      Name: provider.name ?? "",
      Admite: provider.admitsIds.map((id) => String(id)),
      Notes: provider.notes ?? "",
    }),
    [],
  );

  const sortProvidersByName = React.useCallback((items: ProviderDto[]) => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, "es-ES"));
  }, []);

  const handleOpenCreate = React.useCallback(() => {
    setDialogMode("create");
    setActiveProvider(null);
    setDialogInitialValues(buildDefaultFormValues());
    setDeleteError(null);
    setDeleteLoading(false);
    setDeleteConfirmOpen(false);
    setDialogOpen(true);
  }, [buildDefaultFormValues]);

  const handleOpenEdit = React.useCallback(
    (provider: ProviderDto) => {
      setDialogMode("edit");
      setActiveProvider(provider);
      setDialogInitialValues(buildProviderFormValues(provider));
      setDeleteError(null);
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
      setDialogOpen(true);
    },
    [buildProviderFormValues],
  );

  const handleDialogClose = React.useCallback(() => {
    setDialogOpen(false);
    setDialogMode("create");
    setActiveProvider(null);
    setDialogInitialValues(buildDefaultFormValues());
    setDeleteError(null);
    setDeleteLoading(false);
    setDeleteConfirmOpen(false);
  }, [buildDefaultFormValues]);

  const handleSnackbarClose = React.useCallback(() => {
    setSnackbar((prev) => (prev ? { ...prev, open: false } : prev));
  }, []);

  const handleSubmit = React.useCallback(
    async (values: Record<string, any>) => {
      const typedValues = values as ProviderFormValues;
      const payload: Record<string, any> = {};
      const name = String(typedValues.Name ?? "").trim();
      if (!name) {
        throw new Error("Ingresá un nombre válido");
      }
      payload.Name = name;

      const admitsIds = Array.isArray(typedValues.Admite)
        ? typedValues.Admite.map((value) => Number(value)).filter(
            (value) => !Number.isNaN(value) && value > 0,
          )
        : [];
      payload.Admite = admitsIds;

      payload.Notes = String(typedValues.Notes ?? "").trim();

      if (dialogMode === "edit" && !activeProvider) {
        throw new Error("Seleccioná un proveedor válido");
      }

      const endpoint =
        dialogMode === "create"
          ? "/api/providers"
          : `/api/providers/${activeProvider?.id ?? ""}`;

      const response = await fetch(endpoint, {
        method: dialogMode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = text || "No se pudo guardar el proveedor";
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) message = parsed.error;
        } catch {
          // keep text
        }
        throw new Error(message);
      }

      const mapped = (await response.json()) as ProviderDto;

      setProviders((prev) => {
        if (dialogMode === "create") {
          return sortProvidersByName([...prev, mapped]);
        }
        const updated = prev.map((provider) =>
          provider.id === mapped.id ? mapped : provider,
        );
        return sortProvidersByName(updated);
      });

      setSnackbar({
        open: true,
        severity: "success",
        message:
          dialogMode === "create"
            ? "Proveedor creado correctamente"
            : "Proveedor actualizado correctamente",
      });

      handleDialogClose();
    },
    [activeProvider, dialogMode, handleDialogClose, sortProvidersByName],
  );

  const handleDeleteProvider = React.useCallback(async () => {
    if (!activeProvider) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProvider(activeProvider.id);
      setProviders((prev) =>
        prev.filter((provider) => provider.id !== activeProvider.id),
      );
      setSnackbar({
        open: true,
        severity: "success",
        message: "Proveedor eliminado correctamente",
      });
      setDeleteConfirmOpen(false);
      handleDialogClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo borrar el proveedor";
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [activeProvider, handleDialogClose]);

  const dialogFields = React.useMemo<SimpleEntityDialogFieldConfig[]>(
    () => [
      {
        key: "Name",
        label: "Nombre",
        type: "text",
        required: true,
        placeholder: "Nombre del proveedor",
      },
      {
        key: "Admite",
        label: "Admite",
        type: "multi-select",
        options: admitsOptions.map((option) => ({
          label: option.label,
          value: option.id,
        })),
        helperText: "Seleccioná los servicios habilitados (opcional)",
      },
      {
        key: "Notes",
        label: "Notas",
        type: "textarea",
        placeholder: "Notas adicionales",
      },
    ],
    [admitsOptions],
  );

  const dialogSections = React.useMemo<SimpleEntityDialogSection[]>(
    () => [
      {
        title: "Datos del proveedor",
        fields: ["Name", "Admite"],
      },
      {
        title: "Notas",
        fields: ["Notes"],
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="Proveedores"
      description="Gestión integral de proveedores logísticos, viajes asociados y métricas clave."
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
            Proveedores
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Registro centralizado de proveedores de transporte: servicios,
            autorizaciones y viajes realizados.
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
                    {uniquePeriods.map((period) => (
                      <MenuItem key={period} value={period}>
                        {period}
                      </MenuItem>
                    ))}
                  </TextField>
                </FormControl>

                <FormControl fullWidth size="small">
                  <TextField
                    label="Admite"
                    select
                    value={admitFilter}
                    onChange={(event) => setAdmitFilter(event.target.value)}
                    fullWidth
                    size="small"
                    sx={{ bgcolor: "background.paper" }}
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {uniqueAdmits.map((label) => (
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
                  {filteredProviders.length} proveedor
                  {filteredProviders.length === 1 ? "" : "es"} encontrado
                  {filteredProviders.length === 1 ? "" : "s"}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
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
                Nuevo Proveedor
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
                      <TableCell>Nombre</TableCell>
                      <TableCell>Admite</TableCell>
                      <TableCell>Viajes asociados</TableCell>
                      <TableCell align="right">Kgs entregados</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProviders.map((provider, index) => (
                      <TableRow
                        key={provider.id}
                        hover
                        onClick={() => handleOpenEdit(provider)}
                        sx={(theme) => ({
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          bgcolor:
                            index % 2 === 0
                              ? "transparent"
                              : alpha(theme.palette.grey[100], 0.4),
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
                            {provider.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {provider.admitsLabels.length ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              flexWrap="wrap"
                              sx={{ rowGap: 0.5 }}
                            >
                              {provider.admitsLabels.map((label, idx) => (
                                <CropChip
                                  key={`${provider.id}-admit-${idx}`}
                                  crop={label}
                                  size="small"
                                  onClick={(event) => event.stopPropagation()}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.tripIds.length ? (
                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              sx={{ gap: 1 }}
                            >
                              {provider.tripIds.map((tripId, idx) => (
                                <Box
                                  key={`${provider.id}-trip-${tripId}`}
                                  sx={{
                                    flexBasis: {
                                      xs: "100%",
                                      sm: "calc(20% - 0.5rem)",
                                    },
                                  }}
                                >
                                  <Chip
                                    key={`${provider.id}-trip-${tripId}`}
                                    label={
                                      provider.tripLabels[idx] || String(tripId)
                                    }
                                    size="small"
                                    variant="outlined"
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
                        <TableCell align="right">
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            color="primary"
                          >
                            {formatKgs(provider.deliveredKgs)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!filteredProviders.length && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography
                            variant="body1"
                            color="text.secondary"
                            py={3}
                          >
                            No se encontraron proveedores con los filtros
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
                {filteredProviders.length === 0 && (
                  <Paper
                    variant="outlined"
                    sx={(theme) => ({
                      p: 3,
                      textAlign: "center",
                      borderRadius: 2,
                      color: theme.palette.text.secondary,
                    })}
                  >
                    No se encontraron proveedores con los filtros seleccionados.
                  </Paper>
                )}
                {filteredProviders.map((provider) => (
                  <Card
                    key={provider.id}
                    onClick={() => handleOpenEdit(provider)}
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
                            {provider.name}
                          </Typography>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={700}
                          >
                            Admite
                          </Typography>
                          {provider.admitsLabels.length ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              flexWrap="wrap"
                              sx={{ rowGap: 0.5 }}
                            >
                              {provider.admitsLabels.map((label, idx) => (
                                <CropChip
                                  key={`${provider.id}-mobile-admit-${idx}`}
                                  crop={label}
                                  size="small"
                                  onClick={(event) => event.stopPropagation()}
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
                          {provider.tripIds.length ? (
                            <Stack
                              spacing={0.5}
                              flexWrap="wrap"
                              sx={{ rowGap: 0.5 }}
                            >
                              {provider.tripIds.map((tripId, idx) => (
                                <Chip
                                  key={`${provider.id}-mobile-trip-${tripId}`}
                                  component={Link}
                                  href={`/viajes-de-camion/${tripId}`}
                                  onClick={(event) => event.stopPropagation()}
                                  clickable
                                  label={
                                    provider.tripLabels[idx] || String(tripId)
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

                        <Stack spacing={0.5}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={700}
                          >
                            Kgs entregados
                          </Typography>
                          <Typography variant="body1" fontWeight={800}>
                            {formatKgs(provider.deliveredKgs)} kg
                          </Typography>
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
          title={
            dialogMode === "create" ? "Nuevo proveedor" : "Editar proveedor"
          }
          onClose={handleDialogClose}
          onSubmit={handleSubmit}
          fields={dialogFields}
          sections={dialogSections}
          initialValues={dialogInitialValues}
          extraActions={
            dialogMode === "edit" ? (
              <Button
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2.5,
                }}
              >
                {deleteLoading ? "Borrando..." : "Borrar proveedor"}
              </Button>
            ) : undefined
          }
        />
      </Stack>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar proveedor</DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            Esta acción es irreversible. ¿Seguro que euerés borrar al proveedor{" "}
            <Box component="span" fontWeight={700}>
              {activeProvider?.name ?? "seleccionado"}
            </Box>
            ?
          </Typography>
          {deleteError ? (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
              onClose={() => setDeleteError(null)}
            >
              {deleteError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setDeleteError(null);
            }}
            disabled={deleteLoading}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              void handleDeleteProvider();
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

export default ProveedoresPageClient;
