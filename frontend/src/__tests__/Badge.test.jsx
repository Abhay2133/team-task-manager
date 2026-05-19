import { render, screen } from '@testing-library/react';
import { Badge } from '../components/ui/badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>High</Badge>);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('applies default variant class', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('applies destructive variant class', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('applies secondary variant class', () => {
    const { container } = render(<Badge variant="secondary">Low</Badge>);
    expect(container.firstChild).toHaveClass('bg-secondary');
  });
});
