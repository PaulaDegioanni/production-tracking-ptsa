import React from "react";
import Menuitems, { getMenuItemsForRole } from "./MenuItems";
import { Box } from "@mui/material";
import {
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import Logo from '@/app/(DashboardLayout)/layout/shared/logo/Logo';
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";


const renderMenuItems = (items: any, pathDirect: any) => {

  return items.map((item: any) => {

    const Icon = item.icon ? item.icon : IconPoint;

    const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

    if (item.subheader) {
      // Display Subheader
      return (
        <Menu
          subHeading={item.subheader}
          key={item.subheader}
        />
      );
    }

    //If the item has children (submenu)
    if (item.children) {
      return (
        <Submenu
          key={item.id}
          title={item.title}
          icon={itemIcon}
          borderRadius='7px'
        >
          {renderMenuItems(item.children, pathDirect)}
        </Submenu>
      );
    }

    // If the item has no children, render a MenuItem

    return (
      <Box px={3} key={item.id}>
        <MenuItem
          key={item.id}
          isSelected={pathDirect === item?.href}
          borderRadius='8px'
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </MenuItem >
      </Box>

    );
  });
};


const SidebarItems = () => {
  const pathname = usePathname();
  const pathDirect = pathname;
  const { user, loading } = useSession();
  const [menuItems, setMenuItems] = React.useState(Menuitems);

  React.useEffect(() => {
    const items = getMenuItemsForRole(user?.role);
    setMenuItems(items);
  }, [user?.role]);

  return (
    < >
      <MUI_Sidebar width={"100%"} showProfile={false} themeColor={"#3A3180"} themeSecondaryColor={'#CF2C1B'} >
        <Box
          sx={{
            width: 130,
            pointerEvents: "none",
            mx: "auto",
            my: 2,
          }}
        >
          <Logo />
        </Box>
        {renderMenuItems(menuItems, pathDirect)}
      </MUI_Sidebar>

    </>
  );
};
export default SidebarItems;
