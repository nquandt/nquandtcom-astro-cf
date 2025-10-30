import { requireAdmin } from "@/server/auth";
import { listAllUsers } from "@/server/user";
import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
	try {
		// Require admin access
		requireAdmin(context);
		
		const users = await listAllUsers();
		
		// Remove sensitive session data from response
		const sanitizedUsers = users.map(user => {
			const { sessions, ...rest } = user;
			return rest;
		});
		
		return new Response(JSON.stringify(sanitizedUsers), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error("[Admin API] List users error:", error);
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Unauthorized' 
		}), {
			status: 403,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
