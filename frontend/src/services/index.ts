// services/index.ts - Centraliza exports de todos os serviços

// Configuração base
export { api, uploadApi } from './api';

// Tipos compartilhados
export type { PaginatedResponse, ProfileConnection, ConnectionsResponse } from './types';
export { dedupeById } from './types';

// Serviços individuais
export { authService } from './authService';

export { badgeService } from './badgeService';
export { connectionService } from './connectionService';
export { eventService } from './eventService';
export { geocodingService } from './geocoding';
export { ibgeService } from './ibge';
export { instrumentsApi } from './instrumentsApi';
export { fetchIbgeStates, fetchIbgeCitiesByUf } from './ibge';
export { leaderAvailabilityService } from './leaderAvailabilityService';
export { marketplaceService } from './marketplaceService';
export { musicianService } from './musicianService';
export { notificationService } from './notificationService';
export {
  cityAdminService,
  companyService,
  contactRequestService,
  googleAuthService,
  inviteRegisterService,
  musicianRequestService,
  publicMusicianService,
} from './publicApi';
export { registrationService } from './registrationService';
