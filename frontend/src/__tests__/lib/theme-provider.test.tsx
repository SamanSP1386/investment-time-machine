import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { THEME_STORAGE_KEY } from '@/providers/theme-script';

function Consumer() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Use dark</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('throws when useTheme is called outside a ThemeProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useTheme();
      } catch (error) {
        return error as Error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it('defaults to light when there is no stored preference and the system is light', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setTheme updates the DOM attribute and persists the choice', async () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Use dark' }));
    await waitFor(() => expect(screen.getByTestId('resolved')).toHaveTextContent('dark'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
