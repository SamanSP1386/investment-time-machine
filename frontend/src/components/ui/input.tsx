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
            <span aria-hidden className="ml-0.5 text-status-critical">
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
            'figure h-10 rounded-[var(--input-radius)] border border-[var(--input-border)] bg-surface px-3 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:border-[var(--input-border-focus)]',
            error && 'border-status-critical',
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
          <p id={errorId} role="alert" className="text-xs text-status-critical">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
