import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Connections from '@/pages/Connections';

describe('Connections Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(Connections));
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(React.createElement(Connections), {
      wrapper: ({ children }) => React.createElement('div', null, children),
    });

    expect(container).toBeInTheDocument();
  });
});
