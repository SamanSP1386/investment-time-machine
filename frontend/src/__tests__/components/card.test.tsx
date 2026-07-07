import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

describe('Card', () => {
  it('composes header, title, description, and content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Growth Over Time</CardTitle>
          <CardDescription>How the investment grew between start and end date.</CardDescription>
        </CardHeader>
        <CardContent>Chart goes here</CardContent>
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'Growth Over Time' })).toBeInTheDocument();
    expect(screen.getByText('How the investment grew between start and end date.')).toBeInTheDocument();
    expect(screen.getByText('Chart goes here')).toBeInTheDocument();
  });
});
