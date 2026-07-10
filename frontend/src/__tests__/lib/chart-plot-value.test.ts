import { describe, expect, it } from 'vitest';
import { asDecimalString } from '@/lib/format';
import { toChartPlotNumber } from '@/components/simulation-result/chart-plot-value';

describe('toChartPlotNumber', () => {
  it('converts a currency-shaped decimal string to a finite JS number for chart geometry', () => {
    expect(toChartPlotNumber(asDecimalString('1234.56'))).toBe(1234.56);
    expect(toChartPlotNumber(asDecimalString('-40.00'))).toBe(-40);
    expect(toChartPlotNumber(asDecimalString('0'))).toBe(0);
  });
});
