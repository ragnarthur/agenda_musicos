// hooks/useEvents.ts
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { eventService } from '../services/eventService';
import type { Event } from '../types';

interface EventsParams {
  status?: string;
  my_proposals?: boolean;
  pending_approval?: boolean;
  search?: string;
  past?: boolean;
  upcoming?: boolean;
}

const PAGE_SIZE = 20;

const buildKey = (params?: EventsParams, page?: number) => {
  const queryParts: string[] = [];
  if (params?.status) queryParts.push(`status=${params.status}`);
  if (params?.my_proposals) queryParts.push('my_proposals=true');
  if (params?.pending_approval) queryParts.push('pending_approval=true');
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params?.past) queryParts.push('past=true');
  if (params?.upcoming) queryParts.push('upcoming=true');
  if (page) queryParts.push(`page=${page}`);
  queryParts.push(`page_size=${PAGE_SIZE}`);
  return queryParts.length ? `/events?${queryParts.join('&')}` : '/events';
};

export function useEvents(params?: EventsParams) {
  const getKey = (pageIndex: number, previousPageData?: { next: string | null }) => {
    if (previousPageData && !previousPageData.next) return null;
    return buildKey(params, pageIndex + 1);
  };

  const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite(
    getKey,
    key => {
      const query = key.split('?')[1] || '';
      const searchParams = new URLSearchParams(query);
      const page = Number(searchParams.get('page') || 1);
      return eventService.getAllPaginated({ ...params, page, page_size: PAGE_SIZE });
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30s deduplication
      keepPreviousData: true,
    }
  );

  const pages = data ?? [];
  const events = pages.flatMap(page => page.results);
  const count = pages[0]?.count ?? 0;
  const hasMore = pages.length > 0 ? Boolean(pages[pages.length - 1]?.next) : false;
  const isLoadingMore = isValidating && size > 0;

  const loadMore = () => setSize(current => current + 1);

  return {
    events,
    count,
    isLoading,
    isValidating,
    isLoadingMore,
    error,
    mutate,
    loadMore,
    hasMore,
  };
}

export function usePendingMyResponse() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(
    '/events/pending_my_response',
    () => eventService.getPendingMyResponse(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    events: data ?? [],
    count: data?.length ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function usePendingApproval() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(
    '/events?pending_approval=true',
    async () => {
      const page = await eventService.getAllPaginated({ pending_approval: true, page_size: 50 });
      return page.results;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    events: data ?? [],
    count: data?.length ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useUpcomingEvents() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(
    '/events?upcoming=true&status=proposed,confirmed,approved',
    async () => {
      const page = await eventService.getAllPaginated({
        status: 'proposed,confirmed,approved',
        upcoming: true,
        page_size: 50,
      });
      return page.results;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    events: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
