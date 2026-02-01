import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Login from '@/pages/Login';
describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', () => {
        expect(() => {
            render(React.createElement(Login));
        }).not.toThrow();
    });
    it('has container element', () => {
        const { container } = render(React.createElement(Login));
        expect(container).toBeInTheDocument();
    });
});
