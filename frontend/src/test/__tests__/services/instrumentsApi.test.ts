import { describe, it, expect, beforeEach, vi } from 'vitest';
import { instrumentsApi } from '@/services/instrumentsApi';

describe('instrumentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists all instruments successfully', async () => {
    const instruments = await instrumentsApi.list();

    expect(Array.isArray(instruments)).toBe(true);
    expect(instruments.length).toBeGreaterThan(0);
  });

  it('searches instruments by query', async () => {
    const instruments = await instrumentsApi.search('guitarra');

    expect(Array.isArray(instruments)).toBe(true);
    expect(instruments.length).toBeGreaterThan(0);
  });

  it('creates custom instrument successfully', async () => {
    const newInstrument = await instrumentsApi.createCustom('Banjo');

    expect(newInstrument).toBeDefined();
    expect(newInstrument.display_name).toBe('Banjo');
  });
});
