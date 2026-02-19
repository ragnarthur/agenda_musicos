// hooks/useMusicians.ts
import { useCallback } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { musicianService } from '../services/api';
import { leaderAvailabilityService } from '../services/leaderAvailabilityService';
import type { Musician, LeaderAvailability } from '../types';

interface MusiciansParams {
  search?: string;
  instrument?: string;
  page?: number;
}

interface PaginatedResult {
  results: Musician[];
  count: number;
  next: string | null;
  previous: string | null;
}

const PAGE_SIZE = 20;

const buildKey = (base: string, params?: MusiciansParams) => {
  if (!params) return base;
  const queryParts: string[] = [];
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.instrument) queryParts.push(`instrument=${encodeURIComponent(params.instrument)}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  queryParts.push(`page_size=${PAGE_SIZE}`);
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

export function useMusiciansInfinite(params?: MusiciansParams) {
  const getKey = (pageIndex: number, previousPageData?: PaginatedResult) => {
    if (previousPageData && !previousPageData.next) return null;
    return buildKey('/musicians', { ...params, page: pageIndex + 1 });
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite<PaginatedResult>(
      getKey,
      key => {
        const query = key.split('?')[1] || '';
        const searchParams = new URLSearchParams(query);
        const page = Number(searchParams.get('page') || 1);
        return musicianService.getAllPaginated({ ...params, page, page_size: PAGE_SIZE });
      },
      {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        keepPreviousData: true,
      }
    );

  const pages = data ?? [];
  const musicians = pages.flatMap(page => page.results);
  const count = pages[0]?.count ?? 0;
  const hasMore = pages.length > 0 ? Boolean(pages[pages.length - 1]?.next) : false;
  const isLoadingMore = isValidating && size > 0;
  const loadMore = useCallback(() => setSize(current => current + 1), [setSize]);
  const reset = useCallback(() => setSize(1), [setSize]);

  return {
    musicians,
    count,
    hasMore,
    isLoading,
    isValidating,
    isLoadingMore,
    error,
    mutate,
    loadMore,
    reset,
  };
}

export function useAvailabilitiesForDate(
  date: string | null,
  instrument?: string,
  search?: string
) {
  const key = date
    ? `/leader-availabilities/public?date=${date}&inst=${instrument || ''}&search=${encodeURIComponent(search || '')}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<LeaderAvailability[]>(
    key,
    () => leaderAvailabilityService.getPublicForDate(date!, instrument, search),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return {
    availabilities: data ?? [],
    isLoading,
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
