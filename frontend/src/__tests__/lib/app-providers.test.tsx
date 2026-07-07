import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '@/providers/app-providers';

describe('AppProviders', () => {
  it('renders children through the full provider stack without crashing', () => {
    render(
      <AppProviders>
        <p>content</p>
      </AppProviders>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
