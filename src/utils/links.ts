import { buildLocalizedPath, isSupportedLanguage } from "@/utils/language";

type URLLike = {
  pathname?: string | null;
  search?: string | null;
  hash?: string | null;
};

type AstroLike = {
  url?: URLLike;
  locals?: {
    language?: string | null;
  };
};

type BuilderOptions = {
  /**
   * When true, always prefix targets using the language from `ast.locals.language`
   * (if supported). Default: false (only prefix when the current route itself is prefixed).
   */
  forcePrefix?: boolean;
};

/**
 * Extract a two-letter leading language code from a pathname, e.g. "/en/about" -> "en".
 */
export function extractRouteLang(pathname?: string | null): string | null {
  if (!pathname) return null;
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (!m) return null;
  const candidate = m[1].toLowerCase();
  return isSupportedLanguage(candidate) ? candidate : null;
}

/**
 * Create a localized path builder closure from an Astro-like object.
 *
 * Usage:
 *   const localizedPath = makeLocalizedPathBuilder(Astro);
 *   <a href={localizedPath('/about')}>About</a>
 *
 * @param ast - The Astro runtime-like object (only `url.pathname` and `locals.language` are used)
 * @param opts - Optional behavior flags
 * @returns A function `(target: string) => string` which returns a localized href
 */
export function makeLocalizedPathBuilder(ast: AstroLike, opts?: BuilderOptions) {
  const forcePrefix = true; //!!opts?.forcePrefix;
  const currentPathname = ast?.url?.pathname ?? "/";
  const resolvedLang = ast?.locals?.language ?? null;

  const routeLang = extractRouteLang(currentPathname);
  const routeIsPrefixed = !!routeLang && isSupportedLanguage(routeLang);

  function pickLang(): string | null {
    if (forcePrefix) {
      return isSupportedLanguage(resolvedLang) ? String(resolvedLang) : null;
    }
    if (routeIsPrefixed) {
      // Prefer the resolved language if valid; otherwise fall back to route language.
      if (isSupportedLanguage(resolvedLang)) return String(resolvedLang);
      return routeLang;
    }
    return null;
  }

  return function localizedPath(target: string): string {
    if (!target) target = "/";

    // Extract pathname and suffix (search + hash) robustly.
    let pathname = "/";
    let suffix = "";

    try {
      const parsed = new URL(target, "http://example.invalid");
      pathname = parsed.pathname || "/";
      suffix = (parsed.search || "") + (parsed.hash || "");
    } catch {
      // Fallback parsing if URL constructor fails (e.g. unusual input)
      const idxHash = target.indexOf("#");
      const idxQ = target.indexOf("?");
      if (idxHash !== -1) {
        suffix = target.slice(idxHash);
        pathname = target.slice(0, idxHash) || "/";
      } else if (idxQ !== -1) {
        suffix = target.slice(idxQ);
        pathname = target.slice(0, idxQ) || "/";
      } else {
        pathname = target.startsWith("/") ? target : "/" + target;
      }
    }

    const langToUse = pickLang();
    const base = buildLocalizedPath(pathname, langToUse ?? null);
    return base + suffix;
  };
}

/**
 * Convenience one-off function to build a localized href for a single target.
 *
 * @param ast - Astro-like object
 * @param target - The target path (may include query/hash or be a full URL)
 * @param opts - Builder options
 */
export function localizedHref(ast: AstroLike, target: string, opts?: BuilderOptions) {
  return makeLocalizedPathBuilder(ast, opts)(target);
}
