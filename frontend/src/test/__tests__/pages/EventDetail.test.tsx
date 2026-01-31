import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import EventDetail from '@/pages/EventDetail';

describe('EventDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(EventDetail));
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(React.createElement(EventDetail), {
      wrapper: ({ children }) => React.createElement('div', null, children),
    });

    expect(container).toBeInTheDocument();
  });
});
