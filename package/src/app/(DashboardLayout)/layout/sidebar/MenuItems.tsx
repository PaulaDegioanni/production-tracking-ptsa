import {
  IconLayoutDashboard,
  IconFreezeRowColumn,
  IconSeedling,
  IconTruck,
  IconTruckFilled,
  IconUsers,
  IconTractor,
  IconLogin,
  IconUserPlus,
  IconMoneybag,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const baseMenuItems = [
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconLayoutDashboard,
    href: "/",
  },

  {
    navlabel: true,
    subheader: "PRODUCCIÓN",
  },
  {
    id: uniqueId(),
    title: "Ciclos de siembra",
    icon: IconSeedling,
    href: "/ciclos",
  },
  {
    id: uniqueId(),
    title: "Cosechas",
    icon: IconTractor,
    href: "/cosechas",
  },
  {
    navlabel: true,
    subheader: "DISTRIBUCIÓN",
  },
  {
    id: uniqueId(),
    title: "Stock",
    icon: IconMoneybag,
    href: "/stock",
  },
  {
    id: uniqueId(),
    title: "Viajes de camión",
    icon: IconTruck,
    href: "/viajes-de-camion",
  },
  {
    id: uniqueId(),
    title: "Proveedores",
    icon: IconUsers,
    href: "/proveedores",
  },
  {
    navlabel: true,
    subheader: "RECURSOS",
  },
  {
    id: uniqueId(),
    title: "Campos",
    icon: IconFreezeRowColumn,
    href: "/campos",
  },
  {
    id: uniqueId(),
    title: "Camiones",
    icon: IconTruckFilled,
    href: "/camiones",
  },
  {
    navlabel: true,
    subheader: "AUTH",
  },
  {
    id: uniqueId(),
    title: "Login",
    icon: IconLogin,
    href: "/authentication/login",
  },
  {
    id: uniqueId(),
    title: "Register",
    icon: IconUserPlus,
    href: "/authentication/register",
  },
];

const getCosechasItem = () => ({
  id: uniqueId(),
  title: "Cosechas",
  icon: IconTractor,
  href: "/cosechas",
});

export const getMenuItemsForRole = (role?: string) => {
  if (role === "Operador") {
    return [getCosechasItem()];
  }
  return baseMenuItems;
};

export default baseMenuItems;

