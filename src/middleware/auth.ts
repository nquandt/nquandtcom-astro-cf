import { defineMiddleware } from "astro:middleware";
import {
  deleteSessionTokenCookie,
  setSessionTokenCookie,
  validateSessionToken,
} from "@/server/session";

/**
 * Authentication middleware
 *
 * - Reads the `session` cookie
 * - Validates the session token
 * - Refreshes or clears the cookie based on validation result
 * - Attaches `locals.session` and `locals.user` for downstream handlers
 * - Prevents caching for authenticated responses
 */
export const authMiddleware = defineMiddleware(async (context, next) => {
  const token = context.cookies.get("session")?.value ?? null;

  if (token === null) {
    // No session token present: mark as unauthenticated and continue
    context.locals.session = null;
    context.locals.user = null;
    return next();
  }

  // Validate token against session store / auth system
  const { user, session } = await validateSessionToken(token);

  if (session !== null) {
    // Valid session: refresh cookie to extend expiration client-side
    // `setSessionTokenCookie` should set appropriate cookie attributes (httpOnly, secure, sameSite, expires)
    setSessionTokenCookie(context, token, session.expiresAt);
  } else {
    // Invalid / expired token: remove the cookie
    deleteSessionTokenCookie(context);
  }

  // Attach auth info to context for templates/routes to consume
  context.locals.session = session;
  context.locals.user = user;

  // Proceed to next middleware / route and capture the response
  const response = await next();

  // If user is authenticated, prevent intermediary caches from storing the response
  if (session !== null) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
});