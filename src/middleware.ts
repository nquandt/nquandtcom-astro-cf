// Central middleware entrypoint
// This file composes the individual middleware modules (one per file)
// and exports the `onRequest` sequence expected by Astro.
//
// Individual middleware implementations live in `./middleware/*`
// - `logging.ts`
// - `auth.ts`
// - `language.ts`
//
// Each module should export a named middleware (e.g. `export const loggingMiddleware = defineMiddleware(...)`)

import { sequence } from "astro:middleware";

import { loggingMiddleware } from "./middleware/logging.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { languageMiddleware } from "./middleware/language.ts";

export { loggingMiddleware, authMiddleware, languageMiddleware };

export const onRequest = sequence(
  loggingMiddleware,
  authMiddleware,
  languageMiddleware,
);