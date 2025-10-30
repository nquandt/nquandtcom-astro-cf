import { github } from "@/server/oauth";
import { generateState } from "arctic";
import { getUserByUsername } from "@/server/user";

import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
	console.log("[OAuth Start] GET request to /login/github");
	
	// Get username from custom header
	const username = context.request.headers.get("X-GitHub-Username");
	
	if (!username) {
		console.log("[OAuth Start] No username provided in header");
		return new Response(JSON.stringify({ error: "Username is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
	}

	console.log("[OAuth Start] Checking if user exists:", username);
	const user = await getUserByUsername(username);

	if (!user) {
		console.warn("[OAuth Start] User not found:", username);
		return new Response(JSON.stringify({ error: "User not found. Please contact the site administrator." }), {
			status: 404,
			headers: { "Content-Type": "application/json" }
		});
	}

	console.log("[OAuth Start] User found, starting OAuth flow for:", username);
	
	// Store the username in a cookie for OAuth callback verification
	context.cookies.set("github_oauth_username", username.toLowerCase(), {
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		secure: import.meta.env.PROD,
		path: "/",
		sameSite: "lax"
	});

	const state = generateState();
	const url = github.createAuthorizationURL(state, ["user:email"]);

	context.cookies.set("github_oauth_state", state, {
		httpOnly: true,
		maxAge: 60 * 10,
		secure: import.meta.env.PROD,
		path: "/",
		sameSite: "lax"
	});

	console.log("[OAuth Start] Redirecting to GitHub OAuth");
	
	// Return the redirect URL as JSON for fetch to handle
	return new Response(JSON.stringify({ redirectUrl: url.toString() }), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
}
