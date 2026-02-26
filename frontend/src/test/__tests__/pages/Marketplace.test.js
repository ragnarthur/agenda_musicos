import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Marketplace from '@/pages/marketplace/Marketplace';
import { MemoryRouter } from 'react-router-dom';
describe('Marketplace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(MemoryRouter, null, React.createElement(Marketplace)));
    }).not.toThrow();
  });
  it('has container element', () => {
    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(Marketplace))
    );
    expect(container).toBeInTheDocument();
  });
});
