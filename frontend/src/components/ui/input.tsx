import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/**
 * Bordered, label-above (never floating-label — floating labels hurt
 * scanability of pre-filled numeric fields, a real cost here since most
 * inputs are financial figures or dates). Inline validation renders
 * directly under the field. frontend_design_system.md §7.
 *
 * M7 Phase 3D-1 (Craft & Coherence, task B.6): the required marker is a
 * refined, muted glyph — never the harsh default red asterisk, which reads
 * as an alarm for a routine, expected state (a field simply being
 * required, not a problem). The invalid state itself uses a warm tone
 * (`--input-border-invalid`, `--color-status-serious`) rather than
 * `--color-status-critical` — that hue is reserved for hard system/API
 * errors (`ErrorState`) from this pass forward, a real, disclosed semantic
 * split from the previous single shared "error red."
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const describedBy = cn(helperText && !error && helperId, error && errorId) || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-primary">
          {label}
          {required ? (
            <span aria-hidden className="ml-1 text-xs text-ink-muted">
              *
            </span>
          ) : null}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            'figure h-10 rounded-[var(--input-radius)] border border-[var(--input-border)] bg-surface px-3 text-sm text-ink-primary transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] placeholder:text-ink-muted focus-visible:border-[var(--input-border-focus)]',
            error && 'border-[var(--input-border-invalid)]',
            className
          )}
          {...props}
        />
        {helperText && !error ? (
          <p id={helperId} className="text-xs text-ink-secondary">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-status-serious">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
