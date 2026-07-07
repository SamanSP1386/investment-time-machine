/**
 * The prop shape Next.js passes to `error.tsx`/`global-error.tsx`, isolated
 * to one place. `unstable_retry` is explicitly marked unstable by Next.js
 * itself (introduced in v16.2.0 — see this version's own bundled docs,
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`,
 * "Version History") — if a future Next release renames or changes this
 * shape, this is the one place that needs updating, not every file that
 * uses it.
 *
 * This is a type-only isolation, deliberately not a runtime wrapper
 * component: Next.js itself dictates the exact prop signature of the
 * `error.js`/`global-error.js` file-convention special files (it calls
 * these components directly as part of its own routing/rendering
 * pipeline), so wrapping them in a custom runtime abstraction would not
 * reduce actual coupling to the unstable API — Next would still need to
 * call the wrapper with this exact shape. A shared type accomplishes the
 * real goal (one place to update, not two) without fighting the framework.
 */
export interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}
