import {
  IconLayoutDashboard,
  IconPlant2,
  IconTruck,
  IconLogin,
  IconUserPlus,
} from '@tabler/icons-react';

import { uniqueId } from 'lodash';

const Menuitems = [
  {
    navlabel: true,
    subheader: 'PRODUCCIÓN',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconLayoutDashboard,
    href: '/',
  },
  {
    id: uniqueId(),
    title: 'Ciclos de siembra',
    icon: IconPlant2,
    href: '/ciclos',
  },
  {
    id: uniqueId(),
    title: 'Viajes de camión',
    icon: IconTruck,
    href: '/viajes-de-camion',
  },
  {
    navlabel: true,
    subheader: 'AUTH',
  },
  {
    id: uniqueId(),
    title: 'Login',
    icon: IconLogin,
    href: '/authentication/login',
  },
  {
    id: uniqueId(),
    title: 'Register',
    icon: IconUserPlus,
    href: '/authentication/register',
  },
];

export default Menuitems;
