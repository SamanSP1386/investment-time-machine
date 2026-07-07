import { describe, expect, it } from 'vitest';
import { simulationCreateSchema } from '@/lib/api/endpoints/simulations';

const validInput = {
  asset_symbol: 'AAPL',
  investment_amount: '1000.00',
  start_date: '2015-01-01',
  end_date: '2025-01-01',
  include_dividends: false,
  adjust_for_inflation: false,
};

describe('simulationCreateSchema', () => {
  it('accepts a valid simulation request matching docs/api_design.md', () => {
    expect(simulationCreateSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects a non-decimal investment amount (no float coercion, ever)', () => {
    const result = simulationCreateSchema.safeParse({ ...validInput, investment_amount: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 8 decimal places', () => {
    const result = simulationCreateSchema.safeParse({
      ...validInput,
      investment_amount: '1000.123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty asset symbol', () => {
    const result = simulationCreateSchema.safeParse({ ...validInput, asset_symbol: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    const result = simulationCreateSchema.safeParse({ ...validInput, start_date: '01/01/2015' });
    expect(result.success).toBe(false);
  });
});
