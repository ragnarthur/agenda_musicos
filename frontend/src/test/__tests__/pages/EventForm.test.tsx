import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventForm from '@/pages/EventForm';

describe('EventForm Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <MemoryRouter>
          <EventForm />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(
      <MemoryRouter>
        <EventForm />
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
