// hooks/useNotifications.ts
import useSWR from 'swr';
import { eventService } from '../services/api';
import type { Event } from '../types';

interface NotificationCounts {
  pendingMyResponse: number;
  pendingApproval: number;
}

async function fetchNotificationCounts(): Promise<NotificationCounts> {
  const [pendingResult, approvalResult] = await Promise.allSettled([
    eventService.getPendingMyResponse(),
    eventService.getAll({ pending_approval: true }),
  ]);

  return {
    pendingMyResponse: pendingResult.status === 'fulfilled' ? pendingResult.value.length : 0,
    pendingApproval: approvalResult.status === 'fulfilled' ? approvalResult.value.length : 0,
  };
}

export function useNotifications() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<NotificationCounts>(
    '/notifications/counts',
    fetchNotificationCounts,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Poll every 60 seconds on desktop
      dedupingInterval: 30000,
    }
  );

  return {
    pendingMyResponse: data?.pendingMyResponse ?? 0,
    pendingApproval: data?.pendingApproval ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

// Shared data for Dashboard that needs the full events arrays
interface DashboardNotificationsData {
  pendingApprovals: Event[];
  pendingResponses: Event[];
}

async function fetchDashboardNotifications(): Promise<DashboardNotificationsData> {
  const [approvalsResult, responsesResult] = await Promise.allSettled([
    eventService.getAll({ pending_approval: true }),
    eventService.getPendingMyResponse(),
  ]);

  return {
    pendingApprovals: approvalsResult.status === 'fulfilled' ? approvalsResult.value : [],
    pendingResponses: responsesResult.status === 'fulfilled' ? responsesResult.value : [],
  };
}

export function useDashboardNotifications() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardNotificationsData>(
    '/dashboard/notifications',
    fetchDashboardNotifications,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    pendingApprovals: data?.pendingApprovals ?? [],
    pendingResponses: data?.pendingResponses ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
