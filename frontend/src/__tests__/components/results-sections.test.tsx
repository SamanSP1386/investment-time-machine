import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthOverTime, WhyExplanation } from '@/components/simulation-result/results-sections';
import type { SimulationResponse } from '@/types/api';

const BASE_SIM: SimulationResponse = {
  id: 'sim-123',
  status: 'completed',
  asset_symbol: 'AAPL',
  investment_amount: '1000.00000000' as SimulationResponse['investment_amount'],
  start_date: '2015-01-01',
  end_date: '2025-01-01',
  include_dividends: false,
  adjust_for_inflation: false,
  initial_price: '100.00000000' as SimulationResponse['initial_price'],
  final_price: '250.00000000' as SimulationResponse['final_price'],
  shares_purchased: '10.00000000' as SimulationResponse['shares_purchased'],
  final_value: '2500.00000000' as SimulationResponse['final_value'],
  total_return_percentage: '150.000000' as SimulationResponse['total_return_percentage'],
  cagr_percentage: '9.596872' as SimulationResponse['cagr_percentage'],
  inflation_adjusted_final_value: null,
  disclosed_splits: [],
  growth_series: [],
  calculation_version: 'v1',
  error_message: null,
  created_at: '2026-07-18T00:00:00Z',
};

describe('WhyExplanation', () => {
  it('states plainly that dividends were not reinvested when include_dividends is false', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, include_dividends: false }} />);
    expect(screen.getByText(/did not reinvest dividends/)).toBeInTheDocument();
  });

  it('explains dividend reinvestment when include_dividends is true', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, include_dividends: true }} />);
    expect(screen.getByText(/were reinvested/)).toBeInTheDocument();
  });

  it('states plainly that the result is nominal when adjust_for_inflation is false', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, adjust_for_inflation: false }} />);
    expect(screen.getByText(/shown in nominal dollars — it is not adjusted for inflation/)).toBeInTheDocument();
  });

  it('reports the inflation-adjusted figure when adjust_for_inflation is true and the value is available', () => {
    render(
      <WhyExplanation
        sim={{
          ...BASE_SIM,
          adjust_for_inflation: true,
          inflation_adjusted_final_value: '2100.00000000' as SimulationResponse['inflation_adjusted_final_value'],
        }}
      />
    );
    expect(screen.getByText(/represents \$2,100\.00 in today's purchasing power/)).toBeInTheDocument();
  });

  it('states the CPI data gap plainly when adjust_for_inflation is true but the value is unavailable', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, adjust_for_inflation: true, inflation_adjusted_final_value: null }} />);
    expect(screen.getByText(/CPI data needed for this period wasn't available/)).toBeInTheDocument();
  });

  it('falls back to generic price-appreciation copy when initial/final price are unavailable', () => {
    render(<WhyExplanation sim={{ ...BASE_SIM, initial_price: null, final_price: null }} />);
    expect(screen.getByText(/share price moving over this period is the single largest driver/)).toBeInTheDocument();
  });
});

describe('GrowthOverTime', () => {
  it('states the growth-series data gap plainly (KI-021) when growth_series is empty', () => {
    render(<GrowthOverTime sim={{ ...BASE_SIM, growth_series: [] }} />);
    expect(screen.getByText(/isn.t available for this simulation yet/)).toBeInTheDocument();
  });

  it('reports the point count once growth_series is actually populated', () => {
    render(
      <GrowthOverTime
        sim={{
          ...BASE_SIM,
          growth_series: [
            { point_date: '2015-01-01', value: '1000.00000000' as SimulationResponse['growth_series'][number]['value'] },
            { point_date: '2015-01-02', value: '1010.00000000' as SimulationResponse['growth_series'][number]['value'] },
          ],
        }}
      />
    );
    expect(screen.getByText('2 data points recorded across the simulated period.')).toBeInTheDocument();
  });
});
