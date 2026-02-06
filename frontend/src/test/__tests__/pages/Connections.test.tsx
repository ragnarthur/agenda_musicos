import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Connections from '@/pages/Connections';

describe('Connections Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <MemoryRouter>
          <Connections />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(
      <MemoryRouter>
        <Connections />
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
