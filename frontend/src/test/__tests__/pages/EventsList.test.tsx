import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Event } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents, usePendingResponsesCount } from '@/hooks/useEvents';

vi.mock('@/hooks/useEvents', () => ({
  useEvents: vi.fn(),
  usePendingResponsesCount: vi.fn(),
}));
// useAuth is already mocked in src/test/setup.ts; we import it here to override return values.

describe('EventsList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePendingResponsesCount).mockReturnValue({
      count: 0,
      isLoading: false,
      isValidating: false,
      error: undefined,
      mutate: vi.fn(),
    });
  });

  it('renders without crashing', async () => {
    vi.mocked(useEvents).mockReturnValue({
      events: [],
      count: 0,
      isLoading: false,
      isValidating: false,
      isLoadingMore: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    });

    const { default: EventsList } = await import('@/pages/EventsList');
    expect(() => {
      render(
        <MemoryRouter>
          <EventsList />
        </MemoryRouter>
      );
    }).not.toThrow();
  }, 60000);

  it('has container element', async () => {
    vi.mocked(useEvents).mockReturnValue({
      events: [],
      count: 0,
      isLoading: false,
      isValidating: false,
      isLoadingMore: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    });

    const { default: EventsList } = await import('@/pages/EventsList');
    const { container } = render(
      <MemoryRouter>
        <EventsList />
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });

  it('does not show card actions when unauthenticated', async () => {
    const event: Event = {
      id: 10,
      title: 'Evento Teste',
      description: '',
      location: 'Local',
      venue_contact: '',
      payment_amount: null,
      event_date: '2026-02-10',
      start_time: '20:00',
      end_time: '22:00',
      start_datetime: '2026-02-10T20:00:00Z',
      end_datetime: '2026-02-10T22:00:00Z',
      is_solo: false,
      is_private: false,
      status: 'proposed',
      status_display: 'Proposto',
      created_by: 1,
      created_by_name: 'User',
      availabilities: [],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.mocked(useEvents).mockReturnValue({
      events: [event],
      count: 1,
      isLoading: false,
      isValidating: false,
      isLoadingMore: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    });

    const { default: EventsList } = await import('@/pages/EventsList');
    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <EventsList />
      </MemoryRouter>
    );

    expect(screen.queryByLabelText('Editar evento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Excluir evento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cancelar evento')).not.toBeInTheDocument();
  });

  it('shows edit + cancel for creator when event is confirmed', async () => {
    const event: Event = {
      id: 11,
      title: 'Evento Confirmado',
      description: '',
      location: 'Local',
      venue_contact: '',
      payment_amount: null,
      event_date: '2026-02-10',
      start_time: '20:00',
      end_time: '22:00',
      start_datetime: '2026-02-10T20:00:00Z',
      end_datetime: '2026-02-10T22:00:00Z',
      is_solo: false,
      is_private: false,
      status: 'confirmed',
      status_display: 'Confirmado',
      created_by: 1,
      created_by_name: 'User',
      availabilities: [],
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    };

    vi.mocked(useAuth).mockReturnValue({
      // Minimal shape used by EventsList: user.user.id
      user: { id: 999, user: { id: 1 } } as never,
      loading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setSession: vi.fn(),
      refreshUser: vi.fn(),
    });

    vi.mocked(useEvents).mockReturnValue({
      events: [event],
      count: 1,
      isLoading: false,
      isValidating: false,
      isLoadingMore: false,
      error: undefined,
      mutate: vi.fn(),
      loadMore: vi.fn(),
      hasMore: false,
    });

    const { default: EventsList } = await import('@/pages/EventsList');
    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <EventsList />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Editar evento')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancelar evento')).toBeInTheDocument();
  });
});
