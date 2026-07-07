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
