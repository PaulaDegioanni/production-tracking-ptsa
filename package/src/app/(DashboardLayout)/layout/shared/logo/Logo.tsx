import { Box } from "@mui/material";

type LogoProps = {
  width?: number;
  height?: number;
};

const Logo = ({ width = 154, height = 200 }: LogoProps) => {
  return (
    <Box sx={{ display: "inline-flex" }}>
      <img
        src="/images/logos/PTSA-logo-transparent.svg"
        alt="logo PTSA"
        style={{
          width,
          height,
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
};

export default Logo;
