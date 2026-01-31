import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Marketplace from '@/pages/Marketplace';

describe('Marketplace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(Marketplace));
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(React.createElement(Marketplace), {
      wrapper: ({ children }) => React.createElement('div', null, children),
    });

    expect(container).toBeInTheDocument();
  });
});
