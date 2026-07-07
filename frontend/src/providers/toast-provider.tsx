'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'warning' | 'critical';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Defaults to 4000ms — within the brand's 3-5s auto-dismiss rule. */
  durationMs?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

const VARIANT_ICON: Record<ToastVariant, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  default: 'text-ink-secondary',
  success: 'text-status-good',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
};

/**
 * Every toast is calm by construction: no variant is styled to read as
 * celebratory or alarming beyond an icon + a muted-ink border tint — the
 * same rule the AI panel follows (BRAND_CONSTITUTION.md §7, §9). There is
 * deliberately no "AI unavailable" red state; that panel renders inline,
 * never as a toast.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, variant: 'default', ...options }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? DEFAULT_DURATION_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[var(--z-toast)] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => {
          const variant = t.variant ?? 'default';
          const Icon = VARIANT_ICON[variant];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-border-hairline bg-surface p-4 shadow-raised sm:w-auto"
            >
              <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 flex-shrink-0', VARIANT_ICON_COLOR[variant])} />
              <div className="flex-1 text-sm">
                <p className="font-medium text-ink-primary">{t.title}</p>
                {t.description ? <p className="mt-1 text-ink-secondary">{t.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-ink-muted transition-colors hover:text-ink-primary"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
