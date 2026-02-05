import { useMemo } from 'react';
import useSWR from 'swr';
import { musicianService } from '../services/musicianService';
import type { Event, PublicCalendarResponse } from '../types';

interface UseMusicianEventsParams {
  musicianId: number;
  isOwnProfile?: boolean;
}

interface CalendarEvent extends Omit<Event, 'status'> {
  status: Event['status'] | 'available';
  isAvailability?: boolean;
  availabilityNotes?: string;
}

export function useMusicianEvents({
  musicianId,
  isOwnProfile = false,
}: UseMusicianEventsParams) {
  const {
    data: calendarData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PublicCalendarResponse>(
    musicianId ? ['musician-calendar', musicianId] : null,
    async () => {
      return await musicianService.getPublicCalendar(musicianId, {
        include_private: isOwnProfile,
      });
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      errorRetryCount: 2,
    }
  );

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    if (!calendarData) return [];

    const { events, availabilities } = calendarData;
    const combined: CalendarEvent[] = [];

    if (events && events.length > 0) {
      combined.push(...(events as any[]));
    }

    if (availabilities && availabilities.length > 0) {
      availabilities.forEach((avail) => {
        const availabilityEvent: CalendarEvent = {
          id: avail.id * -1,
          title: avail.notes || 'Disponível',
          description: avail.notes,
          location: '',
          venue_contact: '',
          payment_amount: null,
          event_date: avail.date,
          start_time: avail.start_time,
          end_time: avail.end_time,
          start_datetime: avail.start_datetime,
          end_datetime: avail.end_datetime,
          is_solo: false,
          status: 'available',
          status_display: 'Disponível',
          created_by: avail.leader,
          created_by_name: avail.leader_name || '',
          availabilities: [],
          created_at: avail.created_at,
          updated_at: avail.updated_at,
          isAvailability: true,
          availabilityNotes: avail.notes,
        };

        combined.push(availabilityEvent);
      });
    }

    combined.sort((a, b) => {
      const dateA = new Date(`${a.event_date}T${a.start_time}`);
      const dateB = new Date(`${b.event_date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return combined;
  }, [calendarData]);

  return {
    events: calendarEvents,
    rawEvents: calendarData?.events || [],
    availabilities: calendarData?.availabilities || [],
    isOwner: calendarData?.is_owner || false,
    loading: isLoading,
    error,
    isValidating,
    mutate,
  };
}
