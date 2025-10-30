import { deleteSessionTokenCookie, invalidateSession } from "@/server/session";

import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
	console.log("[Logout] Processing logout request");
	
	if (context.locals.session === null) {
		console.warn("[Logout] No active session found");
		return new Response(null, { status: 401 });
	}
	
	console.log("[Logout] Invalidating session:", context.locals.session.id);
	await invalidateSession(context.locals.session.id);
	
	console.log("[Logout] Deleting session cookie");
	deleteSessionTokenCookie(context);
	
	console.log("[Logout] Logout successful");
	return new Response();
}