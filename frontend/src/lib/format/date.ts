/**
 * A fixed locale ('en-US') and explicit UTC time zone, always — never the
 * browser's ambient locale/time zone. `docs/api_design.md` dates are plain
 * ISO calendar dates (`YYYY-MM-DD`) with no time-of-day component;
 * formatting them in the reader's local time zone risks shifting the
 * displayed date by one day depending on where the reader is, which is a
 * correctness bug for a historical-date product, not a cosmetic one.
 * BRAND_CONSTITUTION.md §10: dates must render "consistent across the
 * entire product," which a locale-dependent formatter cannot guarantee.
 */
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `isoDate` must be a plain `YYYY-MM-DD` calendar date, as documented in docs/api_design.md. */
export function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}

/** En dash (–), per BRAND_CONSTITUTION.md's mood-board/report-layout convention for ranges. */
export function formatDateRange(startIsoDate: string, endIsoDate: string): string {
  return `${formatDate(startIsoDate)} – ${formatDate(endIsoDate)}`;
}

/**
 * For a full ISO 8601 timestamp (date + time + zone, e.g. a `created_at`
 * audit field) — never a plain `YYYY-MM-DD` calendar date, which is what
 * `formatDate` above is for. Fixed 'en-US'/UTC, matching `formatDate`'s own
 * rationale exactly (a locale-dependent formatter can't guarantee
 * consistent rendering across readers). Added M7 Phase 3D-3 (item 5) to
 * close a regression: The Proof's "Created" row had been displaying
 * `sim.created_at` raw (an unformatted ISO string) instead of through this
 * module, the one sanctioned place a date is ever formatted for display.
 */
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

export function formatDateTime(isoDateTime: string): string {
  return DATE_TIME_FORMATTER.format(new Date(isoDateTime));
}
