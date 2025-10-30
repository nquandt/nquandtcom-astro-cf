/**
 * List of supported languages in your application
 * Customize this based on your actual supported languages
 */
export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  // "de",
  // "it",
  // "pt",
  "ja",
  // "zh",
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Default language fallback
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * Cookie name for language preference
 */
export const LANGUAGE_COOKIE_NAME = "language";

/**
 * Cookie configuration for language preferences
 */
export const LANGUAGE_COOKIE_CONFIG = {
  maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
  path: "/",
  sameSite: "lax" as const,
} as const;

/**
 * Parse Accept-Language header and return preferred language
 * Handles weighted quality values (e.g., "en-US,en;q=0.9,fr;q=0.8")
 */
export function parseAcceptLanguageHeader(
  acceptLanguageHeader: string | null,
): string | null {
  if (!acceptLanguageHeader) {
    return null;
  }

  // Parse the Accept-Language header
  const languages = acceptLanguageHeader
    .split(",")
    .map((lang) => {
      const [code, q] = lang.trim().split(";");
      const quality = q ? parseFloat(q.replace("q=", "")) : 1.0;
      // Extract base language code (e.g., "en" from "en-US")
      const baseCode = code.trim().split("-")[0].toLowerCase();
      return { code: baseCode, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  return languages[0]?.code ?? null;
}

/**
 * Resolve the user's preferred language from multiple sources
 * Priority: Route override > Cookie override > Accept-Language header > Default language
 *
 * The route override is intended for URL-based locale overrides such as:
 *   https://example.com/{lang}/...
 *
 * @param routeOverride - Optional language code derived from the URL path (highest priority for this request)
 * @param cookieLanguage - Language from cookie (explicit user choice)
 * @param acceptLanguageHeader - Accept-Language header value
 */
export function resolveLanguage(
  routeOverride: string | undefined | null,
  cookieLanguage: string | undefined | null,
  acceptLanguageHeader: string | null,
): SupportedLanguage {
  // Priority 1: Route override (highest priority for the current request/page)
  if (routeOverride && isSupportedLanguage(routeOverride)) {
    return routeOverride;
  }

  // Priority 2: Cookie override (explicit user choice)
  if (cookieLanguage && isSupportedLanguage(cookieLanguage)) {
    return cookieLanguage;
  }

  // Priority 3: Accept-Language header
  const headerLanguage = parseAcceptLanguageHeader(acceptLanguageHeader);
  if (headerLanguage && isSupportedLanguage(headerLanguage)) {
    return headerLanguage;
  }

  // Priority 4: Fallback to default
  return DEFAULT_LANGUAGE;
}

/**
 * Type guard to check if a string is a supported language
 */
export function isSupportedLanguage(lang: unknown): lang is SupportedLanguage {
  return (
    typeof lang === "string" &&
    SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
  );
}

/**
 * Build a localized path by inserting a language prefix when appropriate.
 *
 * Rules:
 * - Normalizes the provided `path` (ensures a leading slash, strips any
 *   existing leading locale segment).
 * - If `language` is provided and supported, returns `/{language}{normalizedPath}`.
 * - If `language` is missing or not supported, returns the normalized path
 *   without any locale prefix.
 *
 * Examples:
 *  buildLocalizedPath("/about", "en")    -> "/en/about"
 *  buildLocalizedPath("/", "ja")         -> "/ja/"
 *  buildLocalizedPath("/en/about", "ja") -> "/ja/about"   (normalizes original)
 *  buildLocalizedPath("/about", null)    -> "/about"
 *
 * @param path - The input path or URL (may include query/search, but only pathname is used)
 * @param language - The desired language code to prefix (optional)
 * @returns A localized path string suitable for use in hrefs/redirects
 */
export function buildLocalizedPath(
  path: string,
  language?: SupportedLanguage | string | null,
): string {
  if (!path) path = "/";

  // Helper to normalize a pathname by removing any leading supported language segment
  const normalizePathname = (pathname: string): string => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && isSupportedLanguage(segments[0])) {
      segments.shift();
    }
    const normalized = "/" + segments.join("/");
    return normalized === "/" ? "/" : normalized;
  };

  try {
    // Use URL to robustly extract pathname even if input contains origin/search/hash
    const parsed = new URL(path, "http://example.invalid");
    const pathname = parsed.pathname || "/";
    const normalized = normalizePathname(pathname);

    if (!language || !isSupportedLanguage(language)) {
      return normalized;
    }

    // Build the localized path. Ensure that root becomes "/{lang}/"
    return "/" + String(language) + (normalized === "/" ? "/" : normalized);
  } catch {
    // Fallback simple normalization if URL parsing fails
    const raw = path.startsWith("/") ? path : "/" + path;
    const normalized = normalizePathname(raw);
    if (!language || !isSupportedLanguage(language)) {
      return normalized;
    }
    return "/" + String(language) + (normalized === "/" ? "/" : normalized);
  }
}
