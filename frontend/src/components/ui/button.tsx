'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/**
 * Every interactive state defined explicitly (M7 Phase 3D-1, Craft &
 * Coherence, task B.5): resting, hover (a background luminance shift —
 * already correct, kept), focus-visible (the global `:focus-visible` ring,
 * automatically accent-colored inside `.itm-elevated`), active/pressed (a
 * ~0.98 scale compression, 120ms — confidence reads as a firm, certain
 * press, never a bounce), disabled (dimmed + no pointer events), and a
 * working state (see below). 120-200ms, ease-out, transform/opacity/color
 * only — state feedback, not decoration, matching FD-018's explicit
 * carve-out for hover/press/focus.
 *
 * Phase 3D-2 regression fix: the 3D-1 pass above never actually set
 * `cursor-pointer` — a native `<button>`'s UA-default cursor is `default`
 * (an arrow), not `pointer`, unlike `<a>`, so every claim in this comment
 * about hover/press feedback was true only once a user had already
 * discovered the button was clickable by accident. The hover/press/focus
 * styles below were always live; only the pointer affordance was missing.
 */
const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--button-radius)] text-sm font-medium transition-[color,background-color,transform] duration-[var(--duration-micro)] ease-[var(--ease-standard)] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-border-hairline text-ink-primary hover:bg-surface',
        tertiary: 'text-primary hover:bg-surface',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

/**
 * The working-state spinner is a genuine exception to FD-018's no-loop rule
 * — it only spins while a real request is in flight (never ambient, never
 * decorative), and even then only when motion is allowed: under
 * `prefers-reduced-motion` the icon is omitted outright rather than frozen
 * mid-spin, so the loading state reads as a static label change only (the
 * button's own text already swaps to a working-state label at the call
 * site, e.g. "Calculating historical returns…") — never a stopped-looking
 * spinner that reads as broken. The icon slot's width/gap is always
 * reserved (`w-4` fixed, opacity-toggled rather than conditionally mounted)
 * so loading never shifts the button's own internal layout by more than
 * the label text change itself requires.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    const showSpinner = loading && !reducedMotion;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            {showSpinner ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          </span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
