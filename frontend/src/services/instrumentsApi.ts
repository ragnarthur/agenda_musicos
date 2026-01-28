// services/instrumentsApi.ts
import { api } from './api';

export interface Instrument {
  id: number;
  name: string;          // Normalizado (ex: 'violao')
  display_name: string;  // Exibição (ex: 'Violão')
  type: 'predefined' | 'community';
  usage_count: number;
}

export const instrumentsService = {
  /**
   * Lista todos os instrumentos disponíveis.
   */
  list: async (): Promise<Instrument[]> => {
    const response = await api.get('/instruments/');
    return response.data;
  },

  /**
   * Busca instrumentos por nome.
   */
  search: async (query: string): Promise<Instrument[]> => {
    const response = await api.get('/instruments/', {
      params: { q: query }
    });
    return response.data;
  },

  /**
   * Retorna instrumentos mais populares.
   */
  popular: async (): Promise<Instrument[]> => {
    const response = await api.get('/instruments/popular/');
    return response.data;
  },

  /**
   * Cria novo instrumento customizado.
   */
  createCustom: async (displayName: string): Promise<Instrument> => {
    const response = await api.post('/instruments/create_custom/', {
      display_name: displayName
    });
    return response.data;
  },
};
