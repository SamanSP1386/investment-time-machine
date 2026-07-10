import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SimulatorPage from '@/app/simulator/page';

vi.mock('@/components/simulator/simulation-form', () => ({
  SimulationForm: () => <div data-testid="simulation-form-stub" />,
}));

describe('SimulatorPage', () => {
  it('renders the page heading and the understated trust indicators, no marketing badges', () => {
    render(<SimulatorPage />);

    expect(screen.getByRole('heading', { name: 'Run a historical simulation.' })).toBeInTheDocument();

    const indicators = screen.getByRole('list', { name: 'Platform principles' });
    expect(indicators).toHaveTextContent('Deterministic simulation');
    expect(indicators).toHaveTextContent('Historical market data');
    expect(indicators).toHaveTextContent('No predictions');
    expect(indicators).toHaveTextContent('Educational platform');

    expect(screen.getByTestId('simulation-form-stub')).toBeInTheDocument();
  });
});
