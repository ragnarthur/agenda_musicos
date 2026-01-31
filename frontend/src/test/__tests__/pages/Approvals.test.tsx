import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Approvals from '@/pages/Approvals';

describe('Approvals Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(Approvals));
    }).not.toThrow();
  });

  it('has container element', () => {
    const { container } = render(React.createElement(Approvals), {
      wrapper: ({ children }) => React.createElement('div', null, children),
    });

    expect(container).toBeInTheDocument();
  });
});
