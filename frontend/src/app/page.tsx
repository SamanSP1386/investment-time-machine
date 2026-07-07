import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';

/**
 * A foundation-verification placeholder, not a product page — mirrors the
 * backend's own M0 /health endpoint: proof the shared foundation (tokens,
 * theme, providers, primitives) renders correctly before any real screen
 * (Landing, Simulator, Results, ...) is built in M7 Phase 2.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Investment Time Machine</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          M7 Phase 1 — frontend foundation. No product pages are built yet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="good">Design tokens</Badge>
          <Badge variant="good">Theme architecture</Badge>
          <Badge variant="good">API client</Badge>
          <Badge variant="good">Primitive components</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Final Value" value="$2,500.00" delta={{ value: '+150.00%', direction: 'positive' }} />
        <StatTile label="CAGR" value="9.60%" source="(final_value / investment_amount)^(1/years) - 1" />
        <StatTile label="Total Return" value="-40.00%" delta={{ value: '-40.00%', direction: 'negative' }} />
      </div>
    </main>
  );
}
