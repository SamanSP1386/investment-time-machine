import { cva } from 'class-variance-authority';

/**
 * Split out of `button.tsx` (which is `'use client'` for `Button`'s own
 * interactivity/hooks) so a Server Component can call `buttonVariants()`
 * directly as a plain function — a client-module export can only be
 * *rendered* from a server component, never invoked as a function
 * (confirmed by a real `next build` prerender failure on the Landing page's
 * primary CTA `Link`, not a hypothetical). `cva`'s class-string builder has
 * no client-only behavior of its own, so this half of the file has no
 * `'use client'` directive at all.
 */
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[var(--button-radius)] text-sm font-medium transition-[color,background-color,transform] duration-[var(--duration-micro)] ease-[var(--ease-standard)] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      variant: {
        // `btn-sweep` (globals.css, M7 Phase 3D-4 item 11) — a faint static
        // gradient border at rest plus a one-shot gold/accent light sweep on
        // hover. Augments the existing `hover:bg-primary-hover` background
        // shift; doesn't replace it.
        primary: 'btn-sweep bg-primary text-primary-foreground hover:bg-primary-hover',
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
