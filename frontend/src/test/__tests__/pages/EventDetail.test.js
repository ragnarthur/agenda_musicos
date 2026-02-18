import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventDetail from '@/pages/EventDetail';
describe('EventDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/eventos/1'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/eventos/:id',
              element: React.createElement(EventDetail),
            })
          )
        )
      );
    }).not.toThrow();
  });
  it('has container element', () => {
    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/eventos/1'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/eventos/:id',
            element: React.createElement(EventDetail),
          })
        )
      )
    );
    expect(container).toBeInTheDocument();
  });
});
