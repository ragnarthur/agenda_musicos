import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import Loading from '@/components/common/Loading';

describe('Loading', () => {
  it('renders loader with default size', () => {
    const { container } = render(React.createElement(Loading));

    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass('h-8', 'w-8');
  });

  it('renders with small size', () => {
    const { container } = render(React.createElement(Loading, { size: 'sm' }));

    const loader = container.querySelector('.animate-spin');
    expect(loader).toHaveClass('h-4', 'w-4');
  });

  it('renders with large size', () => {
    const { container } = render(React.createElement(Loading, { size: 'lg' }));

    const loader = container.querySelector('.animate-spin');
    expect(loader).toHaveClass('h-12', 'w-12');
  });

  it('renders text when provided', () => {
    render(React.createElement(Loading, { text: 'Carregando dados...' }));

    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });
});
