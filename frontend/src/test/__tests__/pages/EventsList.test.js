import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import EventsList from '@/pages/EventsList';
import { MemoryRouter } from 'react-router-dom';
describe('EventsList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(React.createElement(MemoryRouter, null, React.createElement(EventsList)));
    }).not.toThrow();
  });
  it('has container element', () => {
    const { container } = render(
      React.createElement(MemoryRouter, null, React.createElement(EventsList))
    );
    expect(container).toBeInTheDocument();
  });
});
