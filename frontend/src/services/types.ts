// services/types.ts - Tipos compartilhados entre serviços

export type PaginatedResponse<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

export type ProfileConnection = {
  id: number;
  full_name: string;
  instrument?: string | null;
  avatar?: string | null;
};

export type ConnectionsResponse = {
  total: number;
  connections: ProfileConnection[];
  limit?: number;
  type?: string | null;
};

// Função utilitária para deduplicar arrays por ID
export const dedupeById = <T extends { id: number }>(items: T[]): T[] => {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
};
