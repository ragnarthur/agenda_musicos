import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Dashboard from '@/pages/Dashboard';

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(Dashboard));
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(React.createElement(Dashboard), {
      wrapper: ({ children }) => React.createElement('div', null, children),
    });

    expect(container).toBeInTheDocument();
  });
});
