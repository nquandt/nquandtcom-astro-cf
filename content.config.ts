/**
 * content.config.ts
 *
 * Root-level shim that re-exports the content configuration defined in
 * `src/content/config.ts`. Astro previously auto-generated collections for
 * `src/content/*` folders; that behavior is deprecated and Astro now expects
 * a root `content.config.ts`. To avoid duplicating definitions and to maintain
 * the single source of truth, this file simply re-exports the configuration
 * from `src/content/config.ts`.
 *
 * Keep `src/content/config.ts` as the authoritative place to add collections,
 * schemas, and related types. If you later move or rename that file, update
 * this shim accordingly.
 */

/* Re-export everything from the in-repo content config file */
export * from "./src/content/config";
