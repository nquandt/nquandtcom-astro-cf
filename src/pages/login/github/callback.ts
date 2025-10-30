import { github } from "@/server/oauth";
import { ObjectParser } from "@pilcrowjs/object-parser";
import { createUser, getUserFromGitHubId, getUserByUsername, updateUserOnFirstLogin } from "@/server/user";
import { createSession, generateSessionToken, setSessionTokenCookie } from "@/server/session";

import type { OAuth2Tokens } from "arctic";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
	console.log("[OAuth Callback] Starting GitHub OAuth callback");
	
	const storedState = context.cookies.get("github_oauth_state")?.value ?? null;
	const storedUsername = context.cookies.get("github_oauth_username")?.value ?? null;
	const code = context.url.searchParams.get("code");
	const state = context.url.searchParams.get("state");

	console.log("[OAuth Callback] State validation:", { hasStoredState: !!storedState, hasCode: !!code, hasState: !!state, hasUsername: !!storedUsername });

	if (storedState === null || code === null || state === null) {
		console.error("[OAuth Callback] Missing required parameters");
		return context.redirect("/login?error=" + encodeURIComponent("Please restart the login process."));
	}
	if (storedState !== state) {
		console.error("[OAuth Callback] State mismatch");
		return context.redirect("/login?error=" + encodeURIComponent("Please restart the login process."));
	}
	if (storedUsername === null) {
		console.error("[OAuth Callback] Missing username from initial login");
		return context.redirect("/login?error=" + encodeURIComponent("Please restart the login process."));
	}

	console.log("[OAuth Callback] Validating authorization code");
	let tokens: OAuth2Tokens;
	try {
		tokens = await github.validateAuthorizationCode(code);
		console.log("[OAuth Callback] Authorization code validated successfully");
	} catch (e) {
		console.error("[OAuth Callback] Failed to validate authorization code:", e);
		return new Response("Please restart the process.", {
			status: 400
		});
	}

	const githubAccessToken = tokens.accessToken();
	console.log("[OAuth Callback] Access token obtained");

	console.log("[OAuth Callback] Fetching user info from GitHub API");
	const userRequest = new Request("https://api.github.com/user");
	userRequest.headers.set("Authorization", `Bearer ${githubAccessToken}`);
	userRequest.headers.set("User-Agent", "nquandt.com");
	const userResponse = await fetch(userRequest);
	
	if (!userResponse.ok) {
		const errorText = await userResponse.text();
		console.error("[OAuth Callback] GitHub API error:", userResponse.status, errorText);
		return new Response("Failed to fetch user from GitHub.", {
			status: 500
		});
	}
	
	const userResult: unknown = await userResponse.json();
	const userParser = new ObjectParser(userResult);

	const githubUserId = userParser.getNumber("id");
	const username = userParser.getString("login");
	console.log("[OAuth Callback] User info retrieved:", { githubUserId, username });

	// Verify the GitHub username matches the one submitted in the form
	if (username.toLowerCase() !== storedUsername) {
		console.error("[OAuth Callback] Username mismatch:", { expected: storedUsername, received: username });
		// Clear the username cookie
		context.cookies.delete("github_oauth_username");
		return context.redirect("/login?error=" + encodeURIComponent("GitHub username does not match. Please use the correct account."));
	}

	console.log("[OAuth Callback] Checking for existing user");
	const existingUser = await getUserFromGitHubId(githubUserId);
	if (existingUser !== null) {
		console.log("[OAuth Callback] Existing user found, creating session");
		
		// Check if user is active
		if (!existingUser.isActive) {
			console.warn("[OAuth Callback] User account is deactivated:", { userId: existingUser.id, username: existingUser.username });
			context.cookies.delete("github_oauth_username");
			return context.redirect("/login?error=" + encodeURIComponent("Your account has been deactivated. Please contact the site administrator."));
		}
		
		// Clear the username cookie
		context.cookies.delete("github_oauth_username");
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, existingUser.id);
		setSessionTokenCookie(context, sessionToken, session.expiresAt);
		console.log("[OAuth Callback] Session created, redirecting to /");
		return context.redirect("/");
	}
	
	// Check for pre-registered user by username
	console.log("[OAuth Callback] Checking for pre-registered user by username");
	const preRegisteredUser = await getUserByUsername(username);
	if (preRegisteredUser !== null && !preRegisteredUser.githubId) {
		console.log("[OAuth Callback] Pre-registered user found, updating with GitHub details");
		
		// Check if user is active
		if (!preRegisteredUser.isActive) {
			console.warn("[OAuth Callback] Pre-registered user account is deactivated:", { userId: preRegisteredUser.id, username: preRegisteredUser.username });
			context.cookies.delete("github_oauth_username");
			return context.redirect("/login?error=" + encodeURIComponent("Your account has been deactivated. Please contact the site administrator."));
		}
		
		// Verify auth source matches
		if (preRegisteredUser.authSource !== 'github') {
			console.error("[OAuth Callback] Auth source mismatch:", { expected: preRegisteredUser.authSource, received: 'github' });
			context.cookies.delete("github_oauth_username");
			return context.redirect("/login?error=" + encodeURIComponent("Please use the correct authentication method for your account."));
		}
		
		// Fetch email from GitHub
		console.log("[OAuth Callback] Fetching email from GitHub API for pre-registered user");
		const emailListRequest = new Request("https://api.github.com/user/emails");
		emailListRequest.headers.set("Authorization", `Bearer ${githubAccessToken}`);
		emailListRequest.headers.set("User-Agent", "nquandt.com");
		const emailListResponse = await fetch(emailListRequest);
		
		if (!emailListResponse.ok) {
			const errorText = await emailListResponse.text();
			console.error("[OAuth Callback] GitHub API error:", emailListResponse.status, errorText);
			return new Response("Failed to fetch email from GitHub.", {
				status: 500
			});
		}
		
		const emailListResult: unknown = await emailListResponse.json();
		console.log("[OAuth Callback] Email list retrieved:", { count: Array.isArray(emailListResult) ? emailListResult.length : 0 });
		
		if (!Array.isArray(emailListResult) || emailListResult.length < 1) {
			console.error("[OAuth Callback] No emails found in GitHub account");
			return new Response("Please restart the process.", {
				status: 400
			});
		}
		
		let email: string | null = null;
		for (const emailRecord of emailListResult) {
			const emailParser = new ObjectParser(emailRecord);
			const primaryEmail = emailParser.getBoolean("primary");
			const verifiedEmail = emailParser.getBoolean("verified");
			if (primaryEmail && verifiedEmail) {
				email = emailParser.getString("email");
				console.log("[OAuth Callback] Primary verified email found");
			}
		}
		
		if (email === null) {
			console.error("[OAuth Callback] No verified primary email found");
			return new Response("Please verify your GitHub email address.", {
				status: 400
			});
		}
		
		// Verify email matches the pre-registered email		
		if (email.toLowerCase() !== preRegisteredUser.email.toLowerCase()) {
			console.error("[OAuth Callback] Email mismatch:", { 
				expected: preRegisteredUser.email, 
				received: email 
			});
			context.cookies.delete("github_oauth_username");
			return context.redirect("/login?error=" + encodeURIComponent(
				"GitHub email does not match the registered email. Please contact the site administrator."
			));
		}
		
		
		// Update the pre-registered user with GitHub details
		const updatedUser = await updateUserOnFirstLogin(preRegisteredUser.id, githubUserId, email);
		if (!updatedUser) {
			console.error("[OAuth Callback] Failed to update pre-registered user");
			return new Response("Failed to complete registration.", {
				status: 500
			});
		}
		
		console.log("[OAuth Callback] Pre-registered user updated successfully");
		
		// Clear the username cookie
		context.cookies.delete("github_oauth_username");
		
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, updatedUser.id);
		setSessionTokenCookie(context, sessionToken, session.expiresAt);
		console.log("[OAuth Callback] Session created, redirecting to /");
		return context.redirect("/");
	}

	// In production, do not allow new user registration
	if (import.meta.env.PROD) {
		console.warn("[OAuth Callback] New user registration blocked in production:", { githubUserId, username });
		// Clear the username cookie
		context.cookies.delete("github_oauth_username");
		return context.redirect("/login?error=" + encodeURIComponent("User registration is disabled. Please contact the site administrator."));
	}

	console.log("[OAuth Callback] New user (dev mode), fetching email from GitHub API");
	const emailListRequest = new Request("https://api.github.com/user/emails");
	emailListRequest.headers.set("Authorization", `Bearer ${githubAccessToken}`);
	emailListRequest.headers.set("User-Agent", "nquandt.com");
	const emailListResponse = await fetch(emailListRequest);
	
	if (!emailListResponse.ok) {
		const errorText = await emailListResponse.text();
		console.error("[OAuth Callback] GitHub API error:", emailListResponse.status, errorText);
		return new Response("Failed to fetch email from GitHub.", {
			status: 500
		});
	}
	
	const emailListResult: unknown = await emailListResponse.json();
	console.log("[OAuth Callback] Email list retrieved:", { count: Array.isArray(emailListResult) ? emailListResult.length : 0 });
	
	if (!Array.isArray(emailListResult) || emailListResult.length < 1) {
		console.error("[OAuth Callback] No emails found in GitHub account");
		return new Response("Please restart the process.", {
			status: 400
		});
	}
	let email: string | null = null;
	for (const emailRecord of emailListResult) {
		const emailParser = new ObjectParser(emailRecord);
		const primaryEmail = emailParser.getBoolean("primary");
		const verifiedEmail = emailParser.getBoolean("verified");
		if (primaryEmail && verifiedEmail) {
			email = emailParser.getString("email");
			console.log("[OAuth Callback] Primary verified email found");
		}
	}
	if (email === null) {
		console.error("[OAuth Callback] No verified primary email found");
		return new Response("Please verify your GitHub email address.", {
			status: 400
		});
	}

	console.log("[OAuth Callback] Creating new user:", { githubUserId, username, email: email.substring(0, 3) + "***" });
	const user = await createUser(githubUserId, email, username);
	console.log("[OAuth Callback] User created with ID:", user.id);
	
	// Clear the username cookie
	context.cookies.delete("github_oauth_username");
	
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);
	setSessionTokenCookie(context, sessionToken, session.expiresAt);
	console.log("[OAuth Callback] Session created, redirecting to /");
	return context.redirect("/");
}