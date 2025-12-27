import { Box } from "@mui/material";

const Logo = () => {
  return (
    <Box sx={{ display: "inline-flex" }}>
      <img
        src="/images/logos/PTSA-logo-transparent.svg"
        alt="logo PTSA"
        style={{
          width: 134,
          height: 180,
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
};

export default Logo;
