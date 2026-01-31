import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import FormField from '@/components/form/FormField';
import { Mic } from 'lucide-react';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      React.createElement(
        FormField,
        {
          id: 'test-field',
          label: 'Test Label',
        },
        React.createElement('input', { id: 'test-field', type: 'text' })
      )
    );

    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toHaveAttribute('type', 'text');
  });

  it('shows required indicator when required prop is true', () => {
    render(
      React.createElement(
        FormField,
        {
          id: 'test-field',
          label: 'Test Label',
          required: true,
        },
        React.createElement('input', { id: 'test-field' })
      )
    );

    const label = screen.getByText('Test Label');
    expect(label.parentElement?.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(
      React.createElement(
        FormField,
        {
          id: 'test-field',
          label: 'Test Label',
          error: 'This field is required',
        },
        React.createElement('input', { id: 'test-field' })
      )
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-red-600');
  });

  it('shows hint when no error and hint is provided', () => {
    render(
      React.createElement(
        FormField,
        {
          id: 'test-field',
          label: 'Test Label',
          hint: 'Enter your name',
        },
        React.createElement('input', { id: 'test-field' })
      )
    );

    expect(screen.getByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter your name')).toHaveClass('text-gray-500');
  });

  it('renders icon when provided', () => {
    const { container } = render(
      React.createElement(
        FormField,
        {
          id: 'test-field',
          label: 'Test Label',
          icon: React.createElement(Mic),
        },
        React.createElement('input', { id: 'test-field' })
      )
    );

    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });
});
