import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import EventEditForm from '@/pages/EventEditForm';
describe('EventEditForm Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', () => {
        expect(() => {
            render(React.createElement(EventEditForm));
        }).not.toThrow();
    });
    it('has container element', () => {
        const { container } = render(React.createElement(EventEditForm));
        expect(container).toBeInTheDocument();
    });
});
