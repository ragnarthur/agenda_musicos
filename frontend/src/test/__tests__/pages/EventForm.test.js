import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import EventForm from '@/pages/EventForm';
import { MemoryRouter } from 'react-router-dom';
describe('EventForm Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', () => {
        expect(() => {
            render(React.createElement(MemoryRouter, null, React.createElement(EventForm)));
        }).not.toThrow();
    });
    it('has container element', () => {
        const { container } = render(React.createElement(MemoryRouter, null, React.createElement(EventForm)));
        expect(container).toBeInTheDocument();
    });
});
