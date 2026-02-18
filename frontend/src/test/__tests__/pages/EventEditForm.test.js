import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import EventEditForm from '@/pages/EventEditForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
describe('EventEditForm Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders without crashing', () => {
    expect(() => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/eventos/1/editar'] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: '/eventos/:id/editar',
              element: React.createElement(EventEditForm),
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
        { initialEntries: ['/eventos/1/editar'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/eventos/:id/editar',
            element: React.createElement(EventEditForm),
          })
        )
      )
    );
    expect(container).toBeInTheDocument();
  });
});
