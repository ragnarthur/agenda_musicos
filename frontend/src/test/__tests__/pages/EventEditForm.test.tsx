import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventEditForm from '@/pages/EventEditForm';

describe('EventEditForm Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/eventos/1/editar']}>
          <Routes>
            <Route path="/eventos/:id/editar" element={<EventEditForm />} />
          </Routes>
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/eventos/1/editar']}>
        <Routes>
          <Route path="/eventos/:id/editar" element={<EventEditForm />} />
        </Routes>
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
