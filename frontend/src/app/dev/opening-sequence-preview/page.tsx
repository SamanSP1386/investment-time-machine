import { notFound } from 'next/navigation';
import { OpeningSequenceHeading } from '@/components/simulation-result/opening-sequence-heading';
import { GrowthOverTime, SupportingFacts, TheProof, WhyExplanation } from '@/components/simulation-result/results-sections';
import type { SimulationResponse } from '@/types/api';

const MOCK_SIM: SimulationResponse = {
  id: 'preview-sim',
  status: 'completed',
  asset_symbol: 'AAPL',
  investment_amount: '10000.00000000' as SimulationResponse['investment_amount'],
  start_date: '2020-01-02',
  end_date: '2024-01-02',
  include_dividends: true,
  adjust_for_inflation: true,
  initial_price: '75.00000000' as SimulationResponse['initial_price'],
  final_price: '190.00000000' as SimulationResponse['final_price'],
  shares_purchased: '133.33333333' as SimulationResponse['shares_purchased'],
  final_value: '34180.00000000' as SimulationResponse['final_value'],
  total_return_percentage: '241.80000000' as SimulationResponse['total_return_percentage'],
  cagr_percentage: '36.20000000' as SimulationResponse['cagr_percentage'],
  inflation_adjusted_final_value: '28900.00000000' as SimulationResponse['inflation_adjusted_final_value'],
  disclosed_splits: [],
  growth_series: [],
  calculation_version: 'v1',
  error_message: null,
  created_at: '2026-07-19T00:00:00Z',
};

/** TEMPORARY, verification-only preview for M7 Phase 3B.1 — not part of the shipped product, removed once the opening sequence is manually confirmed. */
export default function OpeningSequencePreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-6 sm:p-10">
      <OpeningSequenceHeading sim={MOCK_SIM}>
        <SupportingFacts sim={MOCK_SIM} />
        <GrowthOverTime sim={MOCK_SIM} />
        <WhyExplanation sim={MOCK_SIM} />
        <TheProof sim={MOCK_SIM} />
      </OpeningSequenceHeading>
    </main>
  );
}
