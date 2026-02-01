import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import MusicianProfile from '@/pages/MusicianProfile';
describe('MusicianProfile Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', () => {
        expect(() => {
            render(React.createElement(MusicianProfile));
        }).not.toThrow();
    });
    it('has container element', () => {
        const { container } = render(React.createElement(MusicianProfile), {
            wrapper: ({ children }) => React.createElement('div', null, children),
        });
        expect(container).toBeInTheDocument();
    });
});
