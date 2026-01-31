import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { InstrumentIcon } from '@/components/common/InstrumentIcon';

describe('InstrumentIcon', () => {
  it('renders without crashing for guitar instrument', () => {
    expect(() => {
      render(React.createElement(InstrumentIcon, { instrument: 'guitar' }));
    }).not.toThrow();
  });

  it('renders without crashing for vocal instrument', () => {
    expect(() => {
      render(React.createElement(InstrumentIcon, { instrument: 'vocal' }));
    }).not.toThrow();
  });

  it('renders without crashing for unknown instrument', () => {
    expect(() => {
      render(React.createElement(InstrumentIcon, { instrument: 'unknown_instrument' }));
    }).not.toThrow();
  });

  it('renders with custom size', () => {
    const { container } = render(
      React.createElement(InstrumentIcon, { instrument: 'bass', size: 32 })
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
  });
});
