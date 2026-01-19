"use client";
import { Grid, Box, Stack, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
// components
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import AuthLogin from "../auth/AuthLogin";

const Login2 = () => {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  return (
    <PageContainer
      title="Login"
      description="this is Login page"
      disableMobilePadding
    >
      <Box
        sx={{
          position: "relative",
          bgcolor: "#f7f9fc",

          "&:before": {
            content: '""',
            background: "radial-gradient(#edf7f0, #eff1ff, #e8f2ff)",
            backgroundSize: "400% 400%",
            animation: "gradient 15s ease infinite",
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: "0.2",
          },
        }}
      >
        <Grid
          container
          spacing={0}
          justifyContent="center"
          sx={{ height: "100vh" }}
        >
          <Grid
            display="flex"
            justifyContent="center"
            alignItems="center"
            size={{
              xs: 12,
              sm: 12,
              lg: 4,
              xl: 3,
            }}
          >
            <Box
              sx={{
                px: { xs: 6, sm: 4 },
                py: { xs: 3, sm: 4 },
                zIndex: 1,
                width: "100%",
                maxWidth: "500px",
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="center">
                <Logo width={200} height={200} />
              </Box>
              <AuthLogin
                nextPath={nextPath}
                subtitle={
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    mt={3}
                  ></Stack>
                }
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};
export default Login2;
