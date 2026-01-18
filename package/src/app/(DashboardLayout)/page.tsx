'use client';
import * as React from "react";
import { Grid, Box, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import SalesOverview from "@/app/(DashboardLayout)/components/dashboard/SalesOverview";
import YearlyBreakup from "@/app/(DashboardLayout)/components/dashboard/YearlyBreakup";
import RecentTransactions from "@/app/(DashboardLayout)/components/dashboard/RecentTransactions";
import ProductPerformance from "@/app/(DashboardLayout)/components/dashboard/ProductPerformance";
import Blog from "@/app/(DashboardLayout)/components/dashboard/Blog";
import MonthlyEarnings from "@/app/(DashboardLayout)/components/dashboard/MonthlyEarnings";
import { useSession } from "@/hooks/useSession";

export const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box>
		<Box mb={4}>
          <Typography
            variant="h1"
            fontWeight="600"
            sx={{ color: '#3A3184' }}
          >
            PTSA - Panel de producción
          </Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              lg: 8
            }}>
            <SalesOverview />
          </Grid>
          <Grid
            size={{
              xs: 12,
              lg: 4
            }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <YearlyBreakup />
              </Grid>
              <Grid size={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>
          <Grid
            size={{
              xs: 12,
              lg: 4
            }}>
            <RecentTransactions />
          </Grid>
          <Grid
            size={{
              xs: 12,
              lg: 8
            }}>
            <ProductPerformance />
          </Grid>
          <Grid size={12}>
            <Blog />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

const RootRedirect = () => {
  const router = useRouter();
  const { user, loading } = useSession();

  React.useEffect(() => {
    if (loading) return;
    let lastPath: string | null = null;
    try {
      lastPath = localStorage.getItem("ptsa_last_path");
    } catch {
      lastPath = null;
    }

    const safeLastPath =
      lastPath && lastPath.startsWith("/") && lastPath !== "/"
        ? lastPath
        : "/ciclos";

    if (!user) {
      const nextParam = encodeURIComponent(safeLastPath);
      router.replace(`/authentication/login?next=${nextParam}`);
      return;
    }

    router.replace(safeLastPath);
  }, [loading, router, user]);

  return null;
};

export default RootRedirect;
