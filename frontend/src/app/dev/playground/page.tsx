import { notFound } from 'next/navigation';
import { PlaygroundClient } from './playground-client';

/**
 * Dev-only visual review surface — every primitive component, every
 * important variant, in both themes, for human review before any product
 * page is built (M7 Phase 1.5). Guarded out of production builds; this is
 * tooling, not a product page.
 */
export default function PlaygroundPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <PlaygroundClient />;
}
