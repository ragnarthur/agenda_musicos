import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import MusicianProfile from '@/pages/MusicianProfile';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
describe('MusicianProfile Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders without crashing', () => {
        expect(() => {
            render(React.createElement(MemoryRouter, { initialEntries: ['/musicos/1'] }, React.createElement(Routes, null, React.createElement(Route, { path: "/musicos/:id", element: React.createElement(MusicianProfile) }))));
        }).not.toThrow();
    });
    it('has container element', () => {
        const { container } = render(React.createElement(MemoryRouter, { initialEntries: ['/musicos/1'] }, React.createElement(Routes, null, React.createElement(Route, { path: "/musicos/:id", element: React.createElement(MusicianProfile) }))));
        expect(container).toBeInTheDocument();
    });
});
