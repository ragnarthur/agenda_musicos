// hooks/useEvents.ts
import useSWR from 'swr';
import { eventService } from '../services/api';
import type { Event } from '../types';

interface EventsParams {
  status?: string;
  my_proposals?: boolean;
  pending_approval?: boolean;
  search?: string;
  past?: boolean;
  upcoming?: boolean;
}

const buildKey = (base: string, params?: EventsParams) => {
  if (!params) return base;
  const queryParts: string[] = [];
  if (params.status) queryParts.push(`status=${params.status}`);
  if (params.my_proposals) queryParts.push('my_proposals=true');
  if (params.pending_approval) queryParts.push('pending_approval=true');
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.past) queryParts.push('past=true');
  if (params.upcoming) queryParts.push('upcoming=true');
  return queryParts.length ? `${base}?${queryParts.join('&')}` : base;
};

export function useEvents(params?: EventsParams) {
  const key = buildKey('/events', params);

  const { data, error, isLoading, isValidating, mutate } = useSWR<Event[]>(
    key,
    () => eventService.getAll(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30s deduplication
      keepPreviousData: true,
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
    () => eventService.getAll({ pending_approval: true }),
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
    () => eventService.getAll({ status: 'proposed,confirmed,approved', upcoming: true }),
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
