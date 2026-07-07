import { describe, expect, it } from 'vitest';
import { env } from '@/config/env';

/**
 * `frontend/src/types/api.ts` is hand-written, not generated from the
 * backend's OpenAPI schema (ADR-030 documents why codegen is deferred).
 * This is the drift-detection strategy that decision commits to: fetch the
 * backend's own live `/openapi.json` (FastAPI serves this by default) and
 * assert the field names this frontend depends on still exist. Skips
 * gracefully when no backend is reachable, matching this project's
 * existing convention for environment-dependent tests
 * (`backend/tests/auth/test_lockout.py`, KI-035's resolution).
 *
 * This is deliberately a field-name presence check, not full schema
 * validation — it is meant to catch the exact class of bug found during
 * M7 Phase 1.5 (KI-036/KI-038: a renamed field, a field that became
 * nullable) cheaply, not to replace real integration testing.
 */
async function tryFetchOpenApiSchema(): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/openapi.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const schema = await tryFetchOpenApiSchema();

function getSchemaProperties(root: Record<string, unknown>, name: string): string[] {
  const components = root.components as { schemas?: Record<string, { properties?: Record<string, unknown> }> };
  const target = components?.schemas?.[name];
  return target?.properties ? Object.keys(target.properties) : [];
}

describe.skipIf(schema === null)('API contract drift detection (live backend)', () => {
  it('SimulationResponse has the field names this frontend depends on', () => {
    const properties = getSchemaProperties(schema!, 'SimulationResponse');
    expect(properties).toEqual(
      expect.arrayContaining([
        'id',
        'status',
        'asset_symbol',
        'investment_amount',
        'final_value',
        'total_return_percentage',
        'cagr_percentage',
        'inflation_adjusted_final_value',
        'disclosed_splits',
        'growth_series',
        'error_message',
      ])
    );
  });

  it('GrowthSeriesPoint uses point_date, not date (the KI-036 finding)', () => {
    const properties = getSchemaProperties(schema!, 'GrowthSeriesPoint');
    expect(properties).toContain('point_date');
    expect(properties).not.toContain('date');
  });

  it('DisclosedSplit uses split_date, not date', () => {
    const properties = getSchemaProperties(schema!, 'DisclosedSplit');
    expect(properties).toContain('split_date');
    expect(properties).not.toContain('date');
  });

  it('AssetDetail has the field names this frontend depends on', () => {
    const properties = getSchemaProperties(schema!, 'AssetDetail');
    expect(properties).toEqual(
      expect.arrayContaining(['symbol', 'name', 'asset_type', 'currency', 'data_source', 'is_active', 'exchange'])
    );
  });
});

describe.skipIf(schema !== null)('API contract drift detection (backend unreachable)', () => {
  it('skips gracefully rather than failing when no backend is running', () => {
    expect(schema).toBeNull();
  });
});
