import { useMediaQuery, Box, Drawer } from '@mui/material';
import SidebarItems from './SidebarItems';

interface SidebarProps {
  isMobileSidebarOpen: boolean;
  onSidebarClose: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Sidebar = ({
  isMobileSidebarOpen,
  onSidebarClose,
  isSidebarOpen,
  onToggleSidebar,
}: SidebarProps) => {
  const isDesktop = useMediaQuery((theme: any) => theme.breakpoints.up('md'));

  const sidebarWidth = 240;

  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '7px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#eff2f7',
      borderRadius: '15px',
    },
  };

  // Desktop sidebar: persistent + collapsable
  if (isDesktop) {
    return (
      <Box
        sx={{
          width: isSidebarOpen ? sidebarWidth : 0,
          flexShrink: 0,
          transition: 'width 0.25s ease',
        }}
      >
        <Drawer
          anchor="left"
          open={isSidebarOpen}
          variant="persistent"
          slotProps={{
            paper: {
              sx: {
                boxSizing: 'border-box',
                width: sidebarWidth,
                ...scrollbarStyles,
              },
            },
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Sidebar items */}
            <Box sx={{ flexGrow: 1 }}>
              <SidebarItems />
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  }

  // Mobile sidebar: temporary drawer
  return (
    <Drawer
      anchor="left"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      variant="temporary"
      slotProps={{
        paper: {
          sx: {
            boxShadow: (theme) => theme.shadows[8],
            ...scrollbarStyles,
          },
        },
      }}
    >
      <Box>
        <SidebarItems />
      </Box>
    </Drawer>
  );
};

export default Sidebar;
