import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Newspaper,
  UserPlus,
  Users,
} from 'lucide-react';

export const ADMIN_ROUTES = {
  base: '/admin',
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  alertsTest: '/admin/teste-alertas',
  requests: '/admin/solicitacoes',
  requestsDetail: (id: string | number) => `/admin/solicitacoes/${id}`,
  bookingAudit: '/admin/auditoria-reservas',
  culturalPortal: '/admin/portal-cultural',
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
  alertsTest: 'teste-alertas',
  requests: 'solicitacoes',
  requestsDetail: 'solicitacoes/:id',
  bookingAudit: 'auditoria-reservas',
  culturalPortal: 'portal-cultural',
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
    icon: ClipboardList,
    label: 'Auditoria de Reservas',
    path: ADMIN_ROUTES.bookingAudit,
  },
  {
    icon: Newspaper,
    label: 'Portal Cultural',
    path: ADMIN_ROUTES.culturalPortal,
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
  [ADMIN_ROUTES.alertsTest]: 'Teste de Alertas',
  [ADMIN_ROUTES.requests]: 'Solicitações',
  [ADMIN_ROUTES.culturalPortal]: 'Portal Cultural',
  [ADMIN_ROUTES.users]: 'Usuários',
  [ADMIN_ROUTES.organizations]: 'Contratantes',
  [ADMIN_ROUTES.cities]: 'Cidades',
};
