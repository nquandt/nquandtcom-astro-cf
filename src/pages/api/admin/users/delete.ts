import { requireAdmin } from "@/server/auth";
import { deleteUser } from "@/server/user";
import type { APIContext } from "astro";

export async function POST(context: APIContext): Promise<Response> {
	try {
		// Require admin access
		const currentUser = requireAdmin(context);
		
		// Parse request body
		const body = await context.request.json();
		const { userId } = body;
		
		// Validate input
		if (!userId) {
			return new Response(JSON.stringify({ 
				error: 'Missing required field: userId' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Prevent self-deletion
		if (userId === currentUser.id) {
			return new Response(JSON.stringify({ 
				error: 'Cannot delete your own account' 
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		// Delete user
		const success = await deleteUser(userId);
		
		if (!success) {
			return new Response(JSON.stringify({ 
				error: 'User not found' 
			}), {
				status: 404,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		
		return new Response(JSON.stringify({ 
			success: true,
			message: 'User deleted successfully' 
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error("[Admin API] Delete user error:", error);
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Failed to delete user' 
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
