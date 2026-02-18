import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Connections from '@/pages/Connections';
import { MemoryRouter } from 'react-router-dom';
describe('Connections Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(MemoryRouter, null, React.createElement(Connections)));
    }).not.toThrow();
  });
  it('has container element', () => {
    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(Connections))
    );
    expect(container).toBeInTheDocument();
  });
});
