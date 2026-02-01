import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import React from 'react';
const TestProviders = ({ children }) => {
    return React.createElement(SWRConfig, { value: { dedupingInterval: 0, revalidateOnFocus: false } }, React.createElement(ThemeProvider, null, React.createElement(BrowserRouter, null, React.createElement(AuthProvider, null, children))));
};
export function renderWithProviders(ui, { route = '/', ...options } = {}) {
    window.history.pushState({}, 'Test page', route);
    return {
        ...render(ui, {
            wrapper: TestProviders,
            ...options,
        }),
    };
}
export * from '@testing-library/react';
export { screen, within, waitFor } from '@testing-library/react';
