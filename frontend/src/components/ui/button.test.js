import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  test('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('applies default classes', () => {
    render(<Button>Default</Button>);
    const button = screen.getByText('Default');
    expect(button).toHaveClass('inline-flex');
  });
});
