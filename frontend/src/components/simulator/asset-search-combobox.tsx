'use client';

import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, SearchX } from 'lucide-react';
import { useAssetSearch } from '@/hooks/use-asset-search';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError, getErrorCopy } from '@/lib/api';
import type { AssetSummary, AssetType } from '@/types/api';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;

/**
 * Asset browse mode (M7 Phase 3D-4, item 1) — focusing/clicking the *empty*
 * field opens the full catalog instead of an empty popup, matching a
 * standard combobox's "browse, then narrow" pattern. There is no
 * dedicated "list everything" backend endpoint (`GET /api/v1/assets`
 * requires `query` to be non-empty — `min_length=1`,
 * `backend/app/api/v1/routers/assets.py`) and adding one is a backend
 * change out of scope for this frontend-only pass. `%` is a genuine,
 * non-empty query string that satisfies that constraint while matching
 * every row: the service layer's own match is
 * `Asset.symbol.ilike(f"%{query}%")` (`backend/app/api/v1/services/
 * asset_service.py`), and `f"%{'%'}%"` = `"%%%"`, which is SQL-LIKE-
 * equivalent to a bare `%` (a run of wildcard characters matches the same
 * as one) — a real property of the existing endpoint, not a client-side
 * fabrication of catalog data.
 */
const BROWSE_QUERY = '%';
/** Comfortably above the real+demo starter catalog's current size (~15
 * assets); still under the endpoint's own `le=100` cap
 * (`Query(default=20, ge=1, le=100)`), so browse mode never silently
 * truncates the catalog it's meant to show in full. */
const BROWSE_LIMIT = 100;

const ASSET_TYPE_GROUP_ORDER: Record<AssetType, number> = { stock: 0, etf: 1, crypto: 2 };
const ASSET_TYPE_GROUP_LABELS: Record<AssetType, string> = { stock: 'Stocks', etf: 'ETFs', crypto: 'Crypto' };

/**
 * `seed_dev_data.py`'s own documented convention: every fixture/demo asset's
 * `name` is prefixed "DEMO — ", specifically so it's "the one signal a user
 * actually sees" distinguishing it from the real catalog (KI-044). Reading
 * that existing, real field is presentation-only grouping — not inventing a
 * `is_demo` flag the API doesn't return.
 */
function isDemoAsset(asset: AssetSummary): boolean {
  return asset.name.startsWith('DEMO — ');
}

/**
 * Browse-mode ordering (item 1): grouped Stocks → ETFs → Crypto, demo
 * assets last within each group, alphabetical by symbol otherwise. A plain
 * sort over fields the API already returns — no financial calculation.
 * Exported for a focused unit test independent of the combobox's rendering.
 */
export function sortAssetsForBrowseMode(assets: AssetSummary[]): AssetSummary[] {
  return [...assets].sort((a, b) => {
    const typeDiff = ASSET_TYPE_GROUP_ORDER[a.asset_type] - ASSET_TYPE_GROUP_ORDER[b.asset_type];
    if (typeDiff !== 0) return typeDiff;
    // Not a Number(DecimalString) financial conversion (the lint rule this
    // codebase runs would otherwise flag) — a plain boolean-to-sort-order
    // idiom over a presentation-only grouping flag.
    const demoDiff = (isDemoAsset(a) ? 1 : 0) - (isDemoAsset(b) ? 1 : 0);
    if (demoDiff !== 0) return demoDiff;
    return a.symbol.localeCompare(b.symbol);
  });
}

export interface AssetSearchComboboxProps {
  label: string;
  onChange: (asset: AssetSummary | null) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  /** Merged onto the input element via `cn` (tailwind-merge) — lets a call
   * site (e.g. the M7 Phase 3D Simulator restyle) override the default
   * bordered-box input treatment without a component-level change. */
  className?: string;
  /**
   * Externally-driven selection (M7 Phase 3D-2, refinement 13's example
   * chips) — the combobox otherwise owns its own display text entirely
   * internally, with no way for a parent to programmatically fill it (e.g.
   * "clicking a preset chip fills the form"). Only *sets* the visible text
   * when this prop's symbol changes; it never fights normal typing, since a
   * user's own keystrokes go through `handleInputChange` and never touch
   * this prop.
   */
  value?: AssetSummary | null;
}

/**
 * The `AssetSearchCombobox` named in frontend_design_system.md §13 — a
 * full ARIA combobox (role="combobox" + a role="listbox" popup), backed by
 * `useAssetSearch` (src/hooks/use-asset-search.ts, ADR-032's reference
 * hook). An empty result set is a normal `200 OK` (docs/api_design.md),
 * rendered via `EmptyState`, never as an error.
 */
export function AssetSearchCombobox({
  label,
  onChange,
  error,
  required,
  placeholder,
  className,
  value,
}: AssetSearchComboboxProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;
  const errorId = `${generatedId}-error`;

  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(inputValue.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue]);

  // Reflects an externally-set selection (a preset chip) into the visible
  // text, matching exactly the string `handleSelect` itself would produce
  // for a manually-picked result — the two paths converge on the same
  // display format rather than the chip inventing a second one. Done
  // during render (the React-recommended "adjusting state when a prop
  // changes" pattern), not inside a useEffect — an effect here would
  // commit the stale text for one paint, then immediately schedule a
  // second render to correct it (flagged by
  // react-hooks/set-state-in-effect); comparing against the previous
  // `value` reference during render applies the update before the first
  // paint instead.
  const [priorValue, setPriorValue] = useState(value);
  if (value !== priorValue) {
    setPriorValue(value);
    if (value) setInputValue(`${value.symbol} — ${value.name}`);
  }

  const isBrowseMode = debouncedQuery.length === 0;
  const { data, isFetching, error: searchError } = useAssetSearch(
    isBrowseMode ? { query: BROWSE_QUERY, limit: BROWSE_LIMIT } : { query: debouncedQuery },
    { enabled: isOpen }
  );

  const assets = isBrowseMode ? sortAssetsForBrowseMode(data?.assets ?? []) : (data?.assets ?? []);

  function handleSelect(asset: AssetSummary) {
    setInputValue(`${asset.symbol} — ${asset.name}`);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(asset);
  }

  function handleInputChange(value: string) {
    setInputValue(value);
    setIsOpen(true);
    setActiveIndex(-1);
    onChange(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      // eslint-disable-next-line no-restricted-syntax -- array-length comparison, not a DecimalString comparison (ADR-033).
      setActiveIndex((current) => (current + 1 < assets.length ? current + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) return;
      // eslint-disable-next-line no-restricted-syntax -- array-index arithmetic, not a DecimalString comparison (ADR-033).
      setActiveIndex((current) => (current > 0 ? current - 1 : assets.length - 1));
    } else if (event.key === 'Enter') {
      // eslint-disable-next-line no-restricted-syntax -- array-index comparison, not a DecimalString comparison (ADR-033).
      if (isOpen && activeIndex >= 0 && assets[activeIndex]) {
        event.preventDefault();
        handleSelect(assets[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  // Open, full stop — browse mode (item 1) means the popup has content to
  // show even with an empty query, so "has the user typed something" is no
  // longer the gate; `isOpen` alone (set on focus/click and on every
  // keystroke, cleared on blur/Escape/selection) is.
  const showDropdown = isOpen;
  // eslint-disable-next-line no-restricted-syntax -- array-index comparison, not a DecimalString comparison (ADR-033).
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  let liveMessage = '';
  if (showDropdown) {
    if (isFetching) liveMessage = isBrowseMode ? 'Loading assets…' : 'Searching…';
    else if (searchError) liveMessage = 'Search failed.';
    else if (assets.length === 0) liveMessage = 'No assets found.';
    else if (isBrowseMode) liveMessage = `${assets.length} asset${assets.length === 1 ? '' : 's'} available. Type to filter.`;
    else liveMessage = `${assets.length} result${assets.length === 1 ? '' : 's'} found.`;
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={inputId} className="kicker">
        {label}
        {required ? (
          <span aria-hidden className="ml-1">
            *
          </span>
        ) : null}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        role="combobox"
        type="text"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        required={required}
        placeholder={placeholder ?? 'Search by symbol or name (e.g. AAPL)'}
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Item 1 — focusing/clicking the field always opens the popup now:
          // an empty field opens browse mode (the full catalog, grouped),
          // a field already carrying text re-opens the filtered search for
          // that text. Native `focus` already fires on click, so no
          // separate `onClick` handler is needed for the "clicking" half of
          // "clicking/focusing the empty field" (a native input's click
          // always focuses it first).
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        className={cn(
          'figure h-10 rounded-[var(--input-radius)] border border-[var(--input-border)] bg-surface px-3 text-sm text-ink-primary transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] placeholder:text-ink-muted focus-visible:border-[var(--input-border-focus)]',
          error && 'border-[var(--input-border-invalid)]',
          className
        )}
      />
      <span aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </span>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-status-serious">
          {error}
        </p>
      ) : null}

      {showDropdown ? (
        <div className="absolute top-full z-[var(--z-dropdown)] mt-1 w-full rounded-[var(--card-radius)] border border-border-hairline bg-surface shadow-raised">
          {isFetching ? (
            <div className="flex items-center gap-2 p-4 text-sm text-ink-secondary">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              {isBrowseMode ? 'Loading assets…' : 'Searching…'}
            </div>
          ) : searchError ? (
            <p className="p-4 text-sm text-status-critical">
              {getErrorCopy(searchError instanceof ApiError ? searchError.code : 'INTERNAL_SERVER_ERROR').description}
            </p>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No assets found"
              description={isBrowseMode ? 'No assets are available yet.' : 'Try a different symbol or name.'}
              className="gap-2 border-none p-4 text-left"
            />
          ) : (
            <ul id={listboxId} role="listbox" aria-label={`${label} results`} className="max-h-64 overflow-y-auto py-1">
              {assets.map((asset, index) => {
                // Item 1 — browse mode groups by asset type (Stocks/ETFs/
                // Crypto, demo assets last within each — sortAssetsForBrowseMode
                // above); a group header renders whenever this item's type
                // differs from the previous item's. Headers are
                // `role="presentation"` — inert text inside the listbox, not
                // counted by activeIndex/keyboard navigation, which walks
                // `assets` directly and is unaffected by their presence.
                const showGroupHeader = isBrowseMode && (index === 0 || assets[index - 1].asset_type !== asset.asset_type);
                return (
                  <Fragment key={asset.symbol}>
                    {showGroupHeader ? (
                      <li role="presentation" className="kicker px-3 pt-2.5 pb-1 first:pt-1.5">
                        {ASSET_TYPE_GROUP_LABELS[asset.asset_type]}
                      </li>
                    ) : null}
                    <li
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(asset);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm',
                        index === activeIndex ? 'bg-background' : 'hover:bg-background'
                      )}
                    >
                      <span className="figure font-mono text-ink-primary">{asset.symbol}</span>
                      <span className="flex-1 truncate text-ink-secondary">{asset.name}</span>
                      <span className="text-xs text-ink-muted uppercase">{asset.asset_type}</span>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
