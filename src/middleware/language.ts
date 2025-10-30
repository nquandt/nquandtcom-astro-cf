import { defineMiddleware } from "astro:middleware";
import {
  resolveLanguage,
  LANGUAGE_COOKIE_NAME,
  isSupportedLanguage,
} from "@/utils/language";

/**
 * Language resolution middleware
 *
 * Responsibilities:
 * - Detect optional language override from the first path segment (e.g. /ja/about -> 'ja')
 * - Read language cookie and Accept-Language header
 * - Resolve the effective language using `resolveLanguage`
 * - Attach the resolved language to `context.locals.language`
 * - If a route-level language override was present, rewrite the path and call `next(newPath)`
 * - If no route override but a language cookie exists, redirect to the language-prefixed route
 * - Add `X-User-Language` header for observability on the response
 */
export const languageMiddleware = defineMiddleware(async (context, next) => {
  const originalPath = context.url.pathname || "/";
  let routeOverride: string | null = null;

  // Match a leading two-letter language code like "/ja", "/en/", "/fr/about"
  const match = originalPath.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (match) {
    const candidate = match[1].toLowerCase();
    if (isSupportedLanguage(candidate)) {
      routeOverride = candidate;
    }
  }

  // Read cookie and Accept-Language header
  const cookieLanguage = context.cookies.get(LANGUAGE_COOKIE_NAME)?.value ?? null;
  const acceptLanguageHeader = context.request.headers.get("accept-language") ?? null;

  // Resolve preferred language (routeOverride should have highest priority)
  const language = resolveLanguage(routeOverride, cookieLanguage, acceptLanguageHeader);

  // Expose resolved language to downstream pages/components
  context.locals.language = language;

  // If route override present, rewrite the path so downstream routes don't see the language segment.
  if (routeOverride) {
    // Remove only the first occurrence of the leading language segment (case-insensitive).
    const newPath = originalPath.replace(new RegExp(`^/${routeOverride}`, "i"), "") || "/";
    const response = await next(newPath);
    response.headers.set("X-User-Language", language);
    return response;
  }

  /**
   * New behavior:
   * If there is NO route override but the user has a language cookie,
   * redirect them to the language-prefixed route derived from the cookie.
   *
   * This only applies to typical page requests and avoids redirecting:
   * - API requests (paths starting with /api)
   * - Likely asset/static requests (simple heuristic: paths containing a dot)
   *
   * This ensures that when a user previously selected a language (cookie),
   * they will be sent to URLs like /{lang}/about even if they hit /about.
   * Manual route overrides (explicit lang in the URL) still take priority.
   */
  if (!routeOverride && cookieLanguage && isSupportedLanguage(cookieLanguage)) {
    // Avoid redirecting API or asset requests
    const isApi = originalPath.startsWith("/api");
    const looksLikeAsset = /\.[a-z0-9]{1,8}$/i.test(originalPath);
    if (!isApi && !looksLikeAsset) {
      // If the request is already for the cookie language, do nothing
      const alreadyPrefixed = new RegExp(`^/${cookieLanguage}(?:/|$)`, "i").test(originalPath);
      if (!alreadyPrefixed) {
        const redirectPath =
          "/" + cookieLanguage + (originalPath === "/" ? "/" : originalPath);
        const headers = new Headers();
        headers.set("Location", redirectPath);
        headers.set("X-User-Language", language);
        // Use 307 to preserve method semantics for non-GETs if any; browser navigations will treat it as redirect.
        return new Response(null, { status: 307, headers });
      }
    }
  }

  // No rewrite/redirect needed — proceed normally
  const response = await next();
  response.headers.set("X-User-Language", language);
  return response;
});