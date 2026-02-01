import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils/test-utils';
import { StatCard } from '@/components/ui/StatCard';
import { TrendingUp } from 'lucide-react';
describe('StatCard', () => {
    it('renders label and value correctly', () => {
        renderWithProviders(React.createElement(StatCard, { label: 'Eventos', value: 10 }));
        expect(screen.getByText('Eventos')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });
    it('applies accent class when accent prop is true', () => {
        const { container } = renderWithProviders(React.createElement(StatCard, { label: 'Eventos', value: 10, accent: true }));
        const card = container.firstChild;
        expect(card).toHaveClass('bg-amber-50', 'border-amber-100');
    });
    it('renders icon when provided', () => {
        const { container } = renderWithProviders(React.createElement(StatCard, {
            label: 'Eventos',
            value: 10,
            icon: TrendingUp,
        }));
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
    });
    it('applies custom className', () => {
        const { container } = renderWithProviders(React.createElement(StatCard, {
            label: 'Eventos',
            value: 10,
            className: 'custom-class',
        }));
        const card = container.firstChild;
        expect(card).toHaveClass('custom-class');
    });
});
