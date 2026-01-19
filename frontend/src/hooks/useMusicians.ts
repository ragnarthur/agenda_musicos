// hooks/useMusicians.ts
import useSWR from 'swr';
import { musicianService } from '../services/api';
import type { Musician } from '../types';

interface MusiciansParams {
  search?: string;
  page?: number;
}

interface PaginatedResult {
  results: Musician[];
  count: number;
  next: string | null;
  previous: string | null;
}

const buildKey = (base: string, params?: MusiciansParams) => {
  if (!params) return base;
  const queryParts: string[] = [];
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  return queryParts.length ? `${base}?${queryParts.join('&')}` : base;
};

export function useMusicians() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Musician[]>(
    '/musicians',
    () => musicianService.getAll(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  );

  return {
    musicians: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useMusiciansPaginated(params?: MusiciansParams) {
  const key = buildKey('/musicians/paginated', params);

  const { data, error, isLoading, isValidating, mutate } = useSWR<PaginatedResult>(
    key,
    () => musicianService.getAllPaginated(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  );

  return {
    musicians: data?.results ?? [],
    count: data?.count ?? 0,
    hasNext: !!data?.next,
    hasPrevious: !!data?.previous,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useMusician(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<Musician>(
    id ? `/musicians/${id}` : null,
    () => musicianService.getById(id!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    musician: data,
    isLoading,
    error,
    mutate,
  };
}
