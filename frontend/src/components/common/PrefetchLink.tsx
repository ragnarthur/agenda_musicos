// components/common/PrefetchLink.tsx
import React, { useCallback, useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { mutate } from 'swr';
import { eventService, musicianService, connectionService, badgeService } from '../../services/api';

type PrefetchDataType = 'events' | 'musicians' | 'connections' | 'dashboard';

interface PrefetchLinkProps extends Omit<LinkProps, 'prefetch'> {
  prefetchData?: PrefetchDataType | PrefetchDataType[];
}

const prefetchFunctions: Record<PrefetchDataType, () => void> = {
  events: () => {
    mutate('/events?upcoming=true&status=proposed,confirmed,approved', () =>
      eventService.getAll({ status: 'proposed,confirmed,approved', upcoming: true }),
      { revalidate: false }
    );
  },
  musicians: () => {
    mutate('/musicians', () => musicianService.getAll(), { revalidate: false });
  },
  connections: () => {
    mutate('/connections', () => connectionService.getAll(), { revalidate: false });
    mutate('/badges/progress', () => badgeService.getProgress(), { revalidate: false });
  },
  dashboard: () => {
    mutate('/events?upcoming=true&status=proposed,confirmed,approved', () =>
      eventService.getAll({ status: 'proposed,confirmed,approved', upcoming: true }),
      { revalidate: false }
    );
    mutate('/notifications/counts', async () => {
      const [pendingResult, approvalResult] = await Promise.allSettled([
        eventService.getPendingMyResponse(),
        eventService.getAll({ pending_approval: true }),
      ]);
      return {
        pendingMyResponse: pendingResult.status === 'fulfilled' ? pendingResult.value.length : 0,
        pendingApproval: approvalResult.status === 'fulfilled' ? approvalResult.value.length : 0,
      };
    }, { revalidate: false });
  },
};

const PrefetchLink: React.FC<PrefetchLinkProps> = ({
  prefetchData,
  onMouseEnter,
  onFocus,
  children,
  ...props
}) => {
  const prefetchedRef = useRef(false);

  const doPrefetch = useCallback(() => {
    if (prefetchedRef.current || !prefetchData) return;
    prefetchedRef.current = true;

    const types = Array.isArray(prefetchData) ? prefetchData : [prefetchData];
    types.forEach((type) => {
      const fn = prefetchFunctions[type];
      if (fn) fn();
    });
  }, [prefetchData]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      doPrefetch();
      onMouseEnter?.(e);
    },
    [doPrefetch, onMouseEnter]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLAnchorElement>) => {
      doPrefetch();
      onFocus?.(e);
    },
    [doPrefetch, onFocus]
  );

  return (
    <Link {...props} onMouseEnter={handleMouseEnter} onFocus={handleFocus}>
      {children}
    </Link>
  );
};

export default PrefetchLink;
