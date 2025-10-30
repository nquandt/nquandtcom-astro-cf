import type { APIRoute } from "astro";
import {
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_COOKIE_CONFIG,
  isSupportedLanguage,
} from "@/utils/language";

/**
 * API endpoint to set the user's language preference
 *
 * Usage:
 *   POST /api/set-language
 *   Content-Type: application/json
 *
 *   {
 *     "language": "es"
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "language": "es"
 *   }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { language } = body;

    // Validate the language is supported
    if (!isSupportedLanguage(language)) {
      return new Response(
        JSON.stringify({
          error: "Invalid language",
          message: `Language "${language}" is not supported`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Set the language cookie
    cookies.set(LANGUAGE_COOKIE_NAME, language, LANGUAGE_COOKIE_CONFIG);

    // Compute a localized redirect path. Prefer an explicit `redirectTo` from the request body,
    // otherwise fall back to the Referer header if present, or root `/`.
    let redirectPath: string | null = null;
    try {
      const redirectCandidate =
        body && typeof body.redirectTo === "string"
          ? body.redirectTo
          : (request.headers.get("referer") ?? "/");

      const parsed = new URL(redirectCandidate, "http://example.invalid");
      let path = parsed.pathname || "/";

      // Normalize by removing any leading locale segment (e.g., /ja/about -> /about)
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 0 && isSupportedLanguage(segments[0])) {
        segments.shift();
      }
      const normalized = "/" + segments.join("/");

      // Build the localized path: /{lang}{normalized}
      redirectPath =
        "/" + String(language) + (normalized === "/" ? "/" : normalized);
      // Ensure we have a leading slash
      if (!redirectPath.startsWith("/")) {
        redirectPath = "/" + redirectPath;
      }
    } catch (e) {
      // If parsing fails, fall back to a simple localized root
      redirectPath = "/" + String(language) + "/";
    }

    return new Response(
      JSON.stringify({
        success: true,
        language,
        redirect: redirectPath,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Failed to set language",
        message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
