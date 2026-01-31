import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import React from 'react';

interface TestProvidersProps {
  children: React.ReactNode;
}

const TestProviders: React.FC<TestProvidersProps> = ({ children }) => {
  return React.createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, revalidateOnFocus: false } },
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(BrowserRouter, null, React.createElement(AuthProvider, null, children))
    )
  );
};

interface CustomRenderOptions extends RenderOptions {
  route?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/', ...options }: CustomRenderOptions = {}
) {
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
