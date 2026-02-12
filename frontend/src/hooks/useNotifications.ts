// hooks/useNotifications.ts
import useSWR from 'swr';
import { eventService } from '../services/eventService';

interface NotificationCounts {
  pendingMyResponse: number;
  pendingApproval: number;
}

async function fetchNotificationCounts(): Promise<NotificationCounts> {
  const [pendingResult, approvalResult] = await Promise.allSettled([
    eventService.getPendingMyResponse(),
    eventService.getAllPaginated({ pending_approval: true, page_size: 1 }),
  ]);

  return {
    pendingMyResponse: pendingResult.status === 'fulfilled' ? pendingResult.value.length : 0,
    pendingApproval: approvalResult.status === 'fulfilled' ? approvalResult.value.count : 0,
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
  pendingApprovalsCount: number;
  pendingResponsesCount: number;
}

async function fetchDashboardNotifications(): Promise<DashboardNotificationsData> {
  const [approvalsResult, responsesResult] = await Promise.allSettled([
    eventService.getAllPaginated({ pending_approval: true, page_size: 1 }),
    eventService.getAllPaginated({
      my_proposals: true,
      pending_responses: true,
      page_size: 1,
    }),
  ]);

  return {
    pendingApprovalsCount: approvalsResult.status === 'fulfilled' ? approvalsResult.value.count : 0,
    pendingResponsesCount: responsesResult.status === 'fulfilled' ? responsesResult.value.count : 0,
  };
}

export function useDashboardNotifications() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardNotificationsData>(
    '/dashboard/notifications',
    fetchDashboardNotifications,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 60000,
      dedupingInterval: 30000,
    }
  );

  return {
    pendingApprovalsCount: data?.pendingApprovalsCount ?? 0,
    pendingResponsesCount: data?.pendingResponsesCount ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
