// import { Helmet } from 'react-helmet';
import react from "react";
import { Container } from "@mui/material";

type Props = {
  description?: string;
  children: React.ReactNode;
  title?: string;
};

const PageContainer = ({ title, description, children }: Props) => (
  <>
    <title>{title}</title>
    <meta name="description" content={description} />

    <Container
      maxWidth={false}
      disableGutters
      sx={{
        px: 3,
        maxWidth: "100%",
      }}
    >
      {children}
    </Container>
  </>
);

export default PageContainer;
