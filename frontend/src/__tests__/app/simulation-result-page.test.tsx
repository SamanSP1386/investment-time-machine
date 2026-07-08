import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SimulationResultPage from '@/app/simulation/[id]/page';

const receivedIds: string[] = [];

vi.mock('@/components/simulation-result/simulation-result-client', () => ({
  SimulationResultClient: ({ id }: { id: string }) => {
    receivedIds.push(id);
    return <div data-testid="simulation-result-client-stub">{id}</div>;
  },
}));

describe('SimulationResultPage', () => {
  it('awaits the dynamic route param and passes it through to the client boundary', async () => {
    const jsx = await SimulationResultPage({ params: Promise.resolve({ id: 'sim-123' }) });
    render(jsx);

    expect(screen.getByTestId('simulation-result-client-stub')).toHaveTextContent('sim-123');
    expect(receivedIds).toContain('sim-123');
  });
});
