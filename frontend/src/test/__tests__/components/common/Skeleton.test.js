import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton from '@/components/common/Skeleton';
describe('Skeleton', () => {
    it('renders with default classes', () => {
        const { container } = render(React.createElement(Skeleton));
        const skeleton = container.firstChild;
        expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200', 'rounded');
    });
    it('applies custom className', () => {
        const { container } = render(React.createElement(Skeleton, { className: 'h-10 w-full' }));
        const skeleton = container.firstChild;
        expect(skeleton).toHaveClass('h-10', 'w-full');
    });
    it('has correct ARIA attributes', () => {
        const { container } = render(React.createElement(Skeleton));
        const skeleton = container.firstChild;
        expect(skeleton).toHaveAttribute('role', 'status');
        expect(skeleton).toHaveAttribute('aria-label', 'Carregando...');
    });
});
