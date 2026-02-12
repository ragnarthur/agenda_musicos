import useSWR from 'swr';
import { marketplaceService } from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';

type UnreadCountResponse = { count: number };

async function fetchUnread(): Promise<UnreadCountResponse> {
  return marketplaceService.getUnreadChatCount();
}

export function useMarketplaceChatUnread() {
  const { user } = useAuth();
  const shouldFetch = Boolean(user?.user?.id);

  const { data, error, isLoading, isValidating, mutate } = useSWR<UnreadCountResponse>(
    shouldFetch ? '/marketplace/chat/unread-count' : null,
    fetchUnread,
    {
      revalidateOnFocus: true,
      refreshInterval: 15000,
      dedupingInterval: 5000,
    }
  );

  return {
    unreadCount: data?.count ?? 0,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
