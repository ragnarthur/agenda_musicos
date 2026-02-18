import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Approvals from '@/pages/Approvals';
describe('Approvals Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(MemoryRouter, null, React.createElement(Approvals)));
    }).not.toThrow();
  });
  it('has container element', () => {
    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(Approvals))
    );
    expect(container).toBeInTheDocument();
  });
});
