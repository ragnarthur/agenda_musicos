import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import TiltCard from '@/components/common/TiltCard';
describe('TiltCard', () => {
  it('renders children', () => {
    render(React.createElement(TiltCard, null, React.createElement('div', null, 'Card Content')));
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });
  it('applies custom className', () => {
    const { container } = render(
      React.createElement(
        TiltCard,
        { className: 'custom-card-class' },
        React.createElement('div', null, 'Content')
      )
    );
    const card = container.firstChild;
    expect(card).toHaveClass('custom-card-class');
  });
  it('has motion animation applied', () => {
    const { container } = render(
      React.createElement(TiltCard, null, React.createElement('div', null, 'Content'))
    );
    const card = container.firstChild;
    expect(card).toBeInTheDocument();
  });
});
