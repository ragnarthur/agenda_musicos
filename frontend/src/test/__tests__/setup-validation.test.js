import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../utils/test-utils';
import { StatCard } from '../../components/ui/StatCard';
describe('Setup Validation - MSW', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('MSW server is configured correctly', () => {
        expect(server).toBeDefined();
        expect(typeof server.listen).toBe('function');
        expect(typeof server.close).toBe('function');
        expect(typeof server.resetHandlers).toBe('function');
        expect(typeof server.use).toBe('function');
    });
    it('can render a simple component with providers', () => {
        renderWithProviders(React.createElement(StatCard, { label: 'Test', value: 123 }));
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByText('123')).toBeInTheDocument();
    });
    it('mocks can intercept requests', async () => {
        const testHandler = http.get('/test-endpoint', () => {
            return HttpResponse.json({ message: 'MSW is working!' });
        });
        server.use(testHandler);
        const response = await fetch('/test-endpoint');
        const data = await response.json();
        expect(data.message).toBe('MSW is working!');
    });
    it('sessionStorage mock is available', () => {
        expect(window.sessionStorage).toBeDefined();
        expect(window.sessionStorage.getItem).toBeInstanceOf(Function);
        expect(window.sessionStorage.setItem).toBeInstanceOf(Function);
        expect(window.sessionStorage.removeItem).toBeInstanceOf(Function);
        expect(window.sessionStorage.clear).toBeInstanceOf(Function);
        const mockSetItem = vi.fn();
        vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(mockSetItem);
        const mockGetItem = vi.fn().mockReturnValue('test-value');
        vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(mockGetItem);
        window.sessionStorage.setItem('test-key', 'test-value');
        expect(window.sessionStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
        expect(window.sessionStorage.getItem('test-key')).toBe('test-value');
    });
    it('import.meta.env mock is available', () => {
        expect(import.meta.env.DEV).toBe(true);
    });
});
