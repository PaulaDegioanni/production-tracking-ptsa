'use client';

import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";

import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import type { AppRole } from "@/lib/auth/types";

type LoginResponse = {
  ok?: boolean;
  role?: "admin" | "operador";
  username?: string;
  error?: string;
};

interface AuthLoginProps {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
  nextPath?: string | null;
}

const resolveRedirectPath = (nextPath: string | null, role: AppRole) => {
  const defaultPath = role === "Operador" ? "/cosechas" : "/";

  if (!nextPath || !nextPath.startsWith("/")) {
    return defaultPath;
  }

  if (nextPath.startsWith("/authentication")) {
    return defaultPath;
  }

  if (role === "Operador" && !nextPath.startsWith("/cosechas")) {
    return "/cosechas";
  }

  return nextPath;
};

const AuthLogin = ({ title, subtitle, subtext, nextPath }: AuthLoginProps) => {
  const router = useRouter();
  const [credentials, setCredentials] = React.useState({
    username: "",
    password: "",
    remember: false,
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleRememberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({
      ...prev,
      remember: event.target.checked,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password,
          remember: credentials.remember,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data?.ok) {
        setError("Credenciales inválidas");
        return;
      }

      const role: AppRole =
        data?.role === "operador" ? "Operador" : "Admin";
      const destination = resolveRedirectPath(nextPath ?? null, role);

      router.replace(destination);
      router.refresh();
    } catch (loginError) {
      console.error("Error al iniciar sesión", loginError);
      setError("Ocurrió un error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    credentials.username.trim().length > 0 &&
    credentials.password.length > 0 &&
    !submitting;

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      {error ? (
        <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" noValidate onSubmit={handleSubmit}>
        <Stack>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              component="label"
              htmlFor="username"
              mb="5px"
            >
              Usuario
            </Typography>
            <CustomTextField
              id="username"
              name="username"
              variant="outlined"
              fullWidth
              autoComplete="username"
              value={credentials.username}
              onChange={handleChange}
            />
          </Box>
          <Box mt="25px">
            <Typography
              variant="subtitle1"
              fontWeight={600}
              component="label"
              htmlFor="password"
              mb="5px"
            >
              Contraseña
            </Typography>
            <CustomTextField
              id="password"
              name="password"
              type="password"
              variant="outlined"
              fullWidth
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
            />
          </Box>
          <Stack
            justifyContent="space-between"
            direction="row"
            alignItems="center"
            my={2}
          >
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={credentials.remember}
                    onChange={handleRememberChange}
                  />
                }
                label="Recordar este dispositivo"
              />
            </FormGroup>
            <Typography
              component={Link}
              href="/authentication/reset-password"
              fontWeight="500"
              sx={{
                textDecoration: "none",
                color: "primary.main",
              }}
            >
              Resetear contraseña
            </Typography>
          </Stack>
        </Stack>
        <Box>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </Box>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthLogin;
