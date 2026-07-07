import type { ComponentType, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Color is never the sole carrier of meaning — every Badge pairs its
 * status color with an icon and a text label, always (BRAND_CONSTITUTION
 * §12). Colored from the status palette only; never a chart or brand hue.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--badge-radius)] border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'border-border-hairline text-ink-secondary',
        good: 'border-status-good/30 text-status-good',
        warning: 'border-status-warning/30 text-status-warning',
        serious: 'border-status-serious/30 text-status-serious',
        critical: 'border-status-critical/30 text-status-critical',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const VARIANT_ICON: Record<BadgeVariant, ComponentType<{ className?: string }>> = {
  neutral: Circle,
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: AlertCircle,
  critical: XCircle,
};

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  const resolved: BadgeVariant = variant ?? 'neutral';
  const Icon = VARIANT_ICON[resolved];
  return (
    <span className={cn(badgeVariants({ variant: resolved }), className)}>
      <Icon aria-hidden className="h-3 w-3" />
      {children}
    </span>
  );
}
