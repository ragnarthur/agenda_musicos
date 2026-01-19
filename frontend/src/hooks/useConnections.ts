// hooks/useConnections.ts
import useSWR from 'swr';
import { connectionService, badgeService, musicianService, type BadgeProgressResponse } from '../services/api';
import type { Connection, Musician } from '../types';

export function useConnections() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Connection[]>(
    '/connections',
    () => connectionService.getAll(),
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

export function useConnectionsPage() {
  const { connections, isLoading: loadingConnections, error: connectionsError, mutate: mutateConnections } = useConnections();
  const { badgeData, isLoading: loadingBadges, error: badgesError, mutate: mutateBadges } = useBadgeProgress();

  const { data: musicians, error: musiciansError, isLoading: loadingMusicians } = useSWR<Musician[]>(
    '/musicians',
    () => musicianService.getAll(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const isLoading = loadingConnections || loadingBadges || loadingMusicians;
  const error = connectionsError || badgesError || musiciansError;

  return {
    connections,
    badgeData,
    musicians: musicians ?? [],
    isLoading,
    error,
    mutateConnections,
    mutateBadges,
  };
}
