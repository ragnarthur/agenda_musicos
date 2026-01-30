// hooks/useConnections.ts
import { useCallback } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { connectionService, badgeService, type BadgeProgressResponse } from '../services/api';
import type { Connection } from '../types';
import { useMusiciansInfinite } from './useMusicians';

const PAGE_SIZE = 20;

interface ConnectionsParams {
  type?: string;
}

const buildConnectionsKey = (base: string, params?: ConnectionsParams & { page?: number }) => {
  if (!params) return base;
  const queryParts: string[] = [];
  if (params.type) queryParts.push(`type=${params.type}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  queryParts.push(`page_size=${PAGE_SIZE}`);
  return queryParts.length ? `${base}?${queryParts.join('&')}` : base;
};

export function useConnections() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Connection[]>(
    '/connections?all=true',
    () => connectionService.getAll({ all: true }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    connections: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useConnectionsPaginated(params?: ConnectionsParams) {
  const getKey = (pageIndex: number, previousPageData?: { next: string | null }) => {
    if (previousPageData && !previousPageData.next) return null;
    return buildConnectionsKey('/connections', { ...params, page: pageIndex + 1 });
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite(
    getKey,
    key => {
      const query = key.split('?')[1] || '';
      const searchParams = new URLSearchParams(query);
      const page = Number(searchParams.get('page') || 1);
      return connectionService.getAllPaginated({ ...params, page, page_size: PAGE_SIZE });
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  );

  const pages = data ?? [];
  const connections = pages.flatMap(page => page.results);
  const count = pages[0]?.count ?? 0;
  const hasMore = pages.length > 0 ? Boolean(pages[pages.length - 1]?.next) : false;
  const isLoadingMore = isValidating && size > 0;
  const loadMore = useCallback(() => setSize(current => current + 1), [setSize]);
  const reset = useCallback(() => setSize(1), [setSize]);

  return {
    connections,
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

export function useBadgeProgress() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BadgeProgressResponse>(
    '/badges/progress',
    () => badgeService.getProgress(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    badgeData: data ?? { earned: [], available: [] },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useConnectionsPage(params?: {
  musicianSearch?: string;
  musicianInstrument?: string;
}) {
  const {
    connections,
    isLoading: loadingConnections,
    error: connectionsError,
    mutate: mutateConnections,
  } = useConnections();
  const {
    badgeData,
    isLoading: loadingBadges,
    error: badgesError,
    mutate: mutateBadges,
  } = useBadgeProgress();

  const {
    musicians,
    count: musiciansCount,
    hasMore: hasMoreMusicians,
    isLoading: loadingMusicians,
    isValidating: validatingMusicians,
    error: musiciansError,
    mutate: mutateMusicians,
    loadMore: loadMoreMusicians,
    reset: resetMusicians,
  } = useMusiciansInfinite({
    search: params?.musicianSearch,
    instrument: params?.musicianInstrument,
  });

  const isLoading = loadingConnections || loadingBadges || loadingMusicians;
  const error = connectionsError || badgesError || musiciansError;

  return {
    connections,
    badgeData,
    musicians,
    musiciansCount,
    hasMoreMusicians,
    loadMoreMusicians,
    resetMusicians,
    validatingMusicians,
    mutateMusicians,
    isLoading,
    error,
    mutateConnections,
    mutateBadges,
  };
}
