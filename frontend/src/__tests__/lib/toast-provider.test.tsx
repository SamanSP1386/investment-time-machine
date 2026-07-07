import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/providers/toast-provider';

function Trigger() {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        toast({ title: 'Simulation completed', variant: 'success', durationMs: 60_000 })
      }
    >
      Fire toast
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders a toast on demand and lets the user dismiss it manually', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Fire toast' }));
    expect(await screen.findByText('Simulation completed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByText('Simulation completed')).not.toBeInTheDocument());
  });
});
