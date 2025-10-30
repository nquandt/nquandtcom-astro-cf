import { requireAdmin } from "@/server/auth";
import { updateUserRole, type UserRole } from "@/server/user";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
	try {
		// Require admin access
		requireAdmin(context);
		
		// Parse request body
		const body = await context.request.json();
		const { userId, role } = body;
		
		// Validate input
		if (!userId || !role) {
			return new Response(JSON.stringify({ 
				error: 'Missing required fields: userId, role' 
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
		
		// Update user role
		const user = await updateUserRole(userId, role);
		
		if (!user) {
			return new Response(JSON.stringify({ 
				error: 'User not found' 
			}), {
				status: 404,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Remove sessions from response
		const { sessions, ...sanitizedUser } = user;
		
		return new Response(JSON.stringify(sanitizedUser), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error("[Admin API] Update role error:", error);
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Failed to update role' 
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
