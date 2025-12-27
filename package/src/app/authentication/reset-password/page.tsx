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

const ResetPasswordPage = () => {
  return (
    <PageContainer
      title="Resetear contraseña"
      description="Formulario placeholder para resetear la contraseña"
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Card sx={{ p: 4, maxWidth: "500px", width: "100%" }} elevation={9}>
          <Stack spacing={3}>
            <Box display="flex" justifyContent="center">
              <Logo />
            </Box>
            <Typography variant="h4" fontWeight={700}>
              Recuperar acceso
            </Typography>
            <Typography color="text.secondary">
              Ingresa tu Usuario y pronto podrás recibir un enlace de reseteo en
              tu correo. Esta funcionalidad estará disponible muy pronto.
            </Typography>
            <TextField
              label="Usuario"
              placeholder="usuario123"
              fullWidth
              autoComplete="username"
            />
            <Alert severity="info">
              Password reset via email will be available soon.
            </Alert>
            <Button variant="contained" color="primary" disabled>
              Send reset link
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

export default ResetPasswordPage;
