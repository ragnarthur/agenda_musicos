// services/index.ts - Centraliza exports de todos os serviços

// Configuração base
export { api, uploadApi } from './api';

// Tipos compartilhados
export type { PaginatedResponse, ProfileConnection, ConnectionsResponse } from './types';
export { dedupeById } from './types';

// Serviços individuais
export { authService } from './authService';

// TODO: Extrair dos outros services do api.ts antigo:
// export { musicianService } from './musicianService';
// export { eventService } from './eventService';
// export { availabilityService } from './availabilityService';
// export { connectionService } from './connectionService';
// export { marketplaceService } from './marketplaceService';
// export { registrationService } from './registrationService';
// export { notificationService } from './notificationService';
