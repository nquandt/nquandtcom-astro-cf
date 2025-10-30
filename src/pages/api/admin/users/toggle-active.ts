import { requireAdmin } from "@/server/auth";
import { deactivateUser, reactivateUser } from "@/server/user";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
	try {
		// Require admin access
		requireAdmin(context);
		
		// Parse request body
		const body = await context.request.json();
		const { userId, isActive } = body;
		
		// Validate input
		if (!userId || typeof isActive !== 'boolean') {
			return new Response(JSON.stringify({ 
				error: 'Missing required fields: userId, isActive (boolean)' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Update user active status
		const user = isActive 
			? await reactivateUser(userId) 
			: await deactivateUser(userId);
		
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
		console.error("[Admin API] Toggle active error:", error);
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Failed to update user status' 
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
