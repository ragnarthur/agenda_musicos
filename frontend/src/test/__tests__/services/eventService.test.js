import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventService } from '@/services/eventService';
describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('gets all events paginated', async () => {
    const page = await eventService.getAllPaginated();
    expect(page.results).toBeDefined();
    expect(page.count).toBeGreaterThan(0);
    expect(Array.isArray(page.results)).toBe(true);
  });
  it('gets event by id', async () => {
    const event = await eventService.getById(1);
    expect(event.id).toBe(1);
    expect(event.title).toBeDefined();
  });
  it('creates new event successfully', async () => {
    const newEvent = await eventService.create({
      title: 'Novo Show',
      description: 'Descrição do show',
      location: 'São Paulo',
      event_date: '2024-03-01',
      start_time: '21:00',
      end_time: '23:00',
      is_solo: false,
    });
    expect(newEvent.title).toBe('Novo Show');
    expect(newEvent.id).toBeDefined();
  });
  it('updates event successfully', async () => {
    const updated = await eventService.update(1, {
      title: 'Show Atualizado',
      description: 'Descrição atualizada',
      location: 'São Paulo',
      event_date: '2024-03-01',
      start_time: '21:00',
      end_time: '23:00',
      is_solo: false,
    });
    expect(updated.title).toBe('Show Atualizado');
  });
  it('sets availability for event', async () => {
    const updated = await eventService.setAvailability(1, 'available', 'Estou disponível!');
    expect(updated.availabilities).toBeDefined();
    expect(updated.availabilities.length).toBeGreaterThan(0);
    expect(updated.availabilities[0].response).toBe('available');
  });
  it('cancels event successfully', async () => {
    const cancelled = await eventService.cancel(1);
    expect(cancelled.status).toBe('cancelled');
  });
});
