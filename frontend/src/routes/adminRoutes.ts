import { Building2, LayoutDashboard, MapPin, UserPlus, Users } from 'lucide-react';

export const ADMIN_ROUTES = {
  base: '/admin',
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  requests: '/admin/solicitacoes',
  requestsDetail: (id: string | number) => `/admin/solicitacoes/${id}`,
  cities: '/admin/cidades',
  citiesDetail: (state: string, city: string) =>
    `/admin/cidades/${encodeURIComponent(state)}/${encodeURIComponent(city)}`,
  users: '/admin/usuarios',
  usersDetail: (id: string | number) => `/admin/usuarios/${id}`,
  organizations: '/admin/contratantes',
  organizationsDetail: (id: string | number) => `/admin/contratantes/${id}`,
} as const;

export const ADMIN_CHILD_ROUTES = {
  dashboard: 'dashboard',
  requests: 'solicitacoes',
  requestsDetail: 'solicitacoes/:id',
  cities: 'cidades',
  citiesDetail: 'cidades/:state/:city',
  users: 'usuarios',
  usersDetail: 'usuarios/:id',
  organizations: 'contratantes',
  organizationsDetail: 'contratantes/:id',
} as const;

export const adminNavItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: ADMIN_ROUTES.dashboard,
  },
  {
    icon: Users,
    label: 'Solicitações',
    path: ADMIN_ROUTES.requests,
  },
  {
    icon: UserPlus,
    label: 'Usuários',
    path: ADMIN_ROUTES.users,
  },
  {
    icon: Building2,
    label: 'Contratantes',
    path: ADMIN_ROUTES.organizations,
  },
  {
    icon: MapPin,
    label: 'Cidades',
    path: ADMIN_ROUTES.cities,
  },
] as const;

export const adminRouteLabels: Record<string, string> = {
  [ADMIN_ROUTES.dashboard]: 'Dashboard',
  [ADMIN_ROUTES.requests]: 'Solicitações',
  [ADMIN_ROUTES.users]: 'Usuários',
  [ADMIN_ROUTES.organizations]: 'Contratantes',
  [ADMIN_ROUTES.cities]: 'Cidades',
};
