import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusicianProfile from '@/pages/MusicianProfile';

describe('MusicianProfile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/musicos/1']}>
          <Routes>
            <Route path="/musicos/:id" element={<MusicianProfile />} />
          </Routes>
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/musicos/1']}>
        <Routes>
          <Route path="/musicos/:id" element={<MusicianProfile />} />
        </Routes>
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
