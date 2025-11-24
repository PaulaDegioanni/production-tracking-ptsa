import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  styled,
  Stack,
  IconButton,
  Button,
} from '@mui/material';
import PropTypes from 'prop-types';
import Link from 'next/link';
// components
import Profile from './Profile';
import { IconLayoutSidebar, IconMenu } from '@tabler/icons-react';

interface HeaderProps {
  toggleMobileSidebar: () => void;
  toggleSidebar: () => void;
}

const Header = ({ toggleMobileSidebar, toggleSidebar }: HeaderProps) => {
  // const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  // const lgDown = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: '70px',
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* Mobile menu button */}
        <IconButton
          color="inherit"
          aria-label="open mobile sidebar"
          onClick={toggleMobileSidebar}
          sx={{
            display: {
              md: 'none',
              xs: 'inline-flex',
            },
            mr: 1,
          }}
        >
          <IconMenu width={20} height={20} />
        </IconButton>

        {/* Desktop sidebar toggle */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          onClick={toggleSidebar}
          sx={{
            display: {
              xs: 'none',
              md: 'inline-flex',
            },
            mr: 1,
          }}
        >
          <IconLayoutSidebar size={20} />
        </IconButton>

        <Box flexGrow={1} />

        <Stack spacing={1} direction="row" alignItems="center">
          <Button
            variant="contained"
            component={Link}
            href="/authentication/login"
            disableElevation
            color="primary"
          >
            Login
          </Button>
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

Header.propTypes = {
  sx: PropTypes.object,
};

export default Header;
