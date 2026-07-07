import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves Tailwind class conflicts
 * (e.g. `p-2 p-4` -> `p-4`). The single place every component composes
 * classes through, so no two components invent their own merge logic.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
