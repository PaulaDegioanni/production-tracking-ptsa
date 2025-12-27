"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";

const ResetPasswordTokenPage = () => {
  return (
    <PageContainer
      title="Establecer nueva contraseña"
      description="Placeholder para completar el reseteo con token"
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Card sx={{ p: 4, maxWidth: "520px", width: "100%" }} elevation={9}>
          <Stack spacing={3}>
            <Box display="flex" justifyContent="center">
              <Logo />
            </Box>
            <Typography variant="h4" fontWeight={700}>
              Crear nueva contraseña
            </Typography>
            <Typography color="text.secondary">
              Aquí podrás ingresar la nueva contraseña cuando habilitemos el
              flujo completo de recuperación.
            </Typography>
            <TextField
              label="Nueva contraseña"
              type="password"
              fullWidth
              disabled
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              fullWidth
              disabled
            />
            <Alert severity="info">
              Not implemented yet. Password reset via email will be available
              soon.
            </Alert>
            <Button variant="contained" color="primary" disabled>
              Guardar nueva contraseña
            </Button>
            <Button
              component={Link}
              href="/authentication/login"
              variant="text"
              color="primary"
            >
              Volver al login
            </Button>
          </Stack>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default ResetPasswordTokenPage;

