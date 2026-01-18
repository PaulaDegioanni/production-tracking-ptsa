// import { Helmet } from 'react-helmet';
import react from "react";
import { Container } from "@mui/material";

type Props = {
  description?: string;
  children: React.ReactNode;
  title?: string;
  disableMobilePadding?: boolean;
};

const PageContainer = ({
  title,
  description,
  children,
  disableMobilePadding = false,
}: Props) => (
  <>
    <title>{title}</title>
    <meta name="description" content={description} />

    <Container
      maxWidth={false}
      disableGutters
      sx={{
        px: disableMobilePadding ? { xs: 0, md: 3 } : 3,
        maxWidth: "100%",
      }}
    >
      {children}
    </Container>
  </>
);

export default PageContainer;
