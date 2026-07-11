'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, SearchX } from 'lucide-react';
import { useAssetSearch } from '@/hooks/use-asset-search';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError, getErrorCopy } from '@/lib/api';
import type { AssetSummary } from '@/types/api';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 300;

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

  const { data, isFetching, error: searchError } = useAssetSearch(
    { query: debouncedQuery },
    // eslint-disable-next-line no-restricted-syntax -- string lengths, not a DecimalString comparison (ADR-033).
    { enabled: isOpen && debouncedQuery.length > 0 }
  );

  const assets = data?.assets ?? [];

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

  // eslint-disable-next-line no-restricted-syntax -- string-length comparison, not a DecimalString comparison (ADR-033).
  const showDropdown = isOpen && debouncedQuery.length > 0;
  // eslint-disable-next-line no-restricted-syntax -- array-index comparison, not a DecimalString comparison (ADR-033).
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  let liveMessage = '';
  if (showDropdown) {
    if (isFetching) liveMessage = 'Searching…';
    else if (searchError) liveMessage = 'Search failed.';
    else if (assets.length === 0) liveMessage = 'No assets found.';
    else liveMessage = `${assets.length} result${assets.length === 1 ? '' : 's'} found.`;
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-primary">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-xs text-ink-muted">
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
          // eslint-disable-next-line no-restricted-syntax -- string-length comparison, not a DecimalString comparison (ADR-033).
          if (inputValue.trim().length > 0) setIsOpen(true);
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
              Searching…
            </div>
          ) : searchError ? (
            <p className="p-4 text-sm text-status-critical">
              {getErrorCopy(searchError instanceof ApiError ? searchError.code : 'INTERNAL_SERVER_ERROR').description}
            </p>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No assets found"
              description="Try a different symbol or name."
              className="gap-2 border-none p-4 text-left"
            />
          ) : (
            <ul id={listboxId} role="listbox" aria-label={`${label} results`} className="max-h-64 overflow-y-auto py-1">
              {assets.map((asset, index) => (
                <li
                  key={asset.symbol}
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
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
