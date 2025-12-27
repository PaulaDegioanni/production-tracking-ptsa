'use client';

import React from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";

import { IconLogout, IconUser } from "@tabler/icons-react";

const Profile = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [logoutLoading, setLogoutLoading] = React.useState(false);
  const [session, setSession] = React.useState<{
    authenticated: boolean;
    username?: string;
    name?: string | null;
    role?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const authenticated = Boolean(session?.authenticated && session?.username);

  React.useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        if (!response.ok) {
          setSession({ authenticated: false });
          return;
        }
        const data = (await response.json()) as {
          authenticated: boolean;
          username?: string;
          name?: string | null;
          role?: string;
        };
        setSession(data);
      } catch (error) {
        console.error("Error loading session", error);
        setSession({ authenticated: false });
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (loading) return;
    if (!authenticated) {
      router.push("/authentication/login");
      return;
    }
    setAnchorEl(event.currentTarget);
  };

  const avatarInitial = React.useMemo(() => {
    if (!session?.username) return "?";
    return session.username.charAt(0).toUpperCase();
  }, [session]);

  const displayName = React.useMemo(() => {
    if (loading) return "Cargando…";
    if (session?.name) return session.name;
    if (session?.username) return session.username;
    return "Usuario";
  }, [loading, session]);

  const secondaryText = React.useMemo(() => {
    if (loading) return "Obteniendo sesión…";
    if (session?.username) return `@${session.username}`;
    return "Sin sesión activa";
  }, [loading, session]);

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("No se pudo cerrar sesión");
      }

      setAnchorEl(null);
      router.push("/authentication/login");
      router.refresh();
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <Box display="flex" alignItems="center">
      <IconButton
        size="large"
        color="inherit"
        aria-controls="profile-menu"
        aria-haspopup="true"
        onClick={handleMenuOpen}
        disabled={loading}
        sx={{
          ...(Boolean(anchorEl) && {
            color: "primary.main",
          }),
        }}
      >
        <Avatar
          alt={session?.username || "Usuario"}
          sx={{
            width: 35,
            height: 35,
            fontWeight: 600,
          }}
        >
          {avatarInitial}
        </Avatar>
      </IconButton>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{
          display: { xs: "none", md: "inline" },
          ml: 1,
          fontWeight: 500,
        }}
      >
        {session?.username || ""}
      </Typography>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl) && authenticated}
        onClose={handleMenuClose}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        sx={{
          "& .MuiMenu-paper": {
            width: "200px",
          },
        }}
      >
        <MenuItem disabled sx={{ opacity: 1, cursor: "default" }}>
          <ListItemIcon>
            <IconUser width={20} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography fontWeight={600}>
                {displayName}
              </Typography>
            }
            secondary={secondaryText}
          />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleLogout}
          disabled={logoutLoading || !authenticated}
        >
          <ListItemIcon>
            <IconLogout width={20} />
          </ListItemIcon>
          <ListItemText primary="Cerrar sesión" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Profile;
