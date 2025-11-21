import Link from "next/link";
import { Box, styled } from "@mui/material";
import Image from "next/image";

const LinkStyled = styled(Link)(() => ({
  height: "70px",
  width: "180px",
  overflow: "hidden",
  display: "block",
}));

const Logo = () => {
  return (
	 <Box
        sx={{
          width: 200,          // ancho máximo del logo en el sidebar
          height: 110,          // alto máximo del logo
          position: 'relative',
		  marginTop: 5,
		  marginLeft: 4
        }}
      >
    <LinkStyled href="/">
      <Image src="/images/logos/PTSA-logo-transparent.svg" alt="logo" height={70} width={134} priority style={{ objectFit: 'contain',}}/>
    </LinkStyled></Box>
  );
};

export default Logo;
