import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';

export const CONTRACTOR_ROUTES = {
  base: '/contratante',
  login: '/contratante/login',
  register: '/contratante/cadastro',
  dashboard: '/contratante/dashboard',
  browseMusicians: '/contratante/musicos',
  newRequest: '/contratante/novo-pedido',
  requests: '/contratante/pedidos',
  requestDetail: (id: string | number) => `/contratante/pedidos/${id}`,
  profile: '/contratante/perfil',
} as const;

export const contractorNavItems = [
  { icon: Home, label: 'Início', path: CONTRACTOR_ROUTES.dashboard },
  { icon: Search, label: 'Músicos', path: CONTRACTOR_ROUTES.browseMusicians },
  { icon: PlusCircle, label: 'Novo Pedido', path: CONTRACTOR_ROUTES.newRequest, isAction: true },
  { icon: MessageSquare, label: 'Pedidos', path: CONTRACTOR_ROUTES.requests },
  { icon: User, label: 'Perfil', path: CONTRACTOR_ROUTES.profile },
] as const;
