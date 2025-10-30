import { requireAdmin } from "@/server/auth";
import { createPreRegisteredUser, type UserRole, type AuthSource } from "@/server/user";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
	try {
		// Require admin access
		requireAdmin(context);
		
		// Parse request body
		const body = await context.request.json();
		const { username, email, role, authSource } = body;
		
		// Validate input
		if (!username || !email || !role || !authSource) {
			return new Response(JSON.stringify({ 
				error: 'Missing required fields: username, email, role, authSource' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Validate role
		const validRoles: UserRole[] = ['admin', 'editor', 'reader'];
		if (!validRoles.includes(role)) {
			return new Response(JSON.stringify({ 
				error: 'Invalid role. Must be: admin, editor, or reader' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Validate auth source
		const validAuthSources: AuthSource[] = ['github', 'google', 'microsoft'];
		if (!validAuthSources.includes(authSource)) {
			return new Response(JSON.stringify({ 
				error: 'Invalid auth source. Must be: github, google, or microsoft' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Create pre-registered user
		const user = await createPreRegisteredUser(username, email, role, authSource);
		
		// Remove sessions from response
		const { sessions, ...sanitizedUser } = user;
		
		return new Response(JSON.stringify(sanitizedUser), {
			status: 201,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error("[Admin API] Create user error:", error);
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Failed to create user' 
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
