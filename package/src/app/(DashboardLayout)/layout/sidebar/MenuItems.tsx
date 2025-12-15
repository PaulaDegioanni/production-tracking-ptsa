import {
  IconLayoutDashboard,
  IconFreezeRowColumn,
  IconSeedling,
  IconTruck,
  IconTractor,
  IconLogin,
  IconUserPlus,
  IconMoneybag,
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
    title: 'Campos',
    icon: IconFreezeRowColumn,
    href: '/campos',
  },
  {
    id: uniqueId(),
    title: 'Ciclos de siembra',
    icon: IconSeedling,
    href: '/ciclos',
  },
  {
    id: uniqueId(),
    title: 'Cosechas',
    icon: IconTractor,
    href: '/cosechas',
  },
  {
    id: uniqueId(),
    title: 'Stock',
    icon: IconMoneybag,
    href: '/stock',
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
