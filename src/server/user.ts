import { getEnv } from "@/utils/env";

const USERS = getEnv("USERS")!;

export async function createUser(githubId: number, email: string, username: string, role: UserRole = 'reader'): Promise<User> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'create_user',
		timestamp: new Date().toISOString(),
		githubId,
		email,
		username,
		role,
	}));

	try {
		// Generate a unique user ID using UUID without dashes
		const userId = crypto.randomUUID().replace(/-/g, '');
		
		const now = new Date().toISOString();
		
		const user: User = {
			id: userId,
			githubId,
			email,
			username,
			role,
			authSource: 'github',
			isActive: true,
			createdAt: now,
			updatedAt: now
		};
		
		// Store user profile
		await USERS.put(`profile:${userId}`, JSON.stringify(user));
		
		// Create secondary index by githubId for lookups
		await USERS.put(`index:github:${githubId}`, userId);

		// Create secondary index by username for lookups
		await USERS.put(`index:username:${username.toLowerCase()}`, userId);
		
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'create_user_success',
			timestamp: new Date().toISOString(),
			userId,
			username,
		}));

		return user;
	} catch (error) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'create_user_error',
			timestamp: new Date().toISOString(),
			username,
			error: error instanceof Error ? error.message : String(error),
		}));
		throw error;
	}
}

export async function getUserByUsername(username: string): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'get_user_by_username',
		timestamp: new Date().toISOString(),
		username,
	}));

	// Look up user ID from username index
	const userId = await USERS.get(`index:username:${username.toLowerCase()}`);
	
	if (!userId) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'get_user_by_username_not_found',
			timestamp: new Date().toISOString(),
			username,
		}));
		return null;
	}
	
	return getUserById(userId);
}

export async function getUserFromGitHubId(githubId: number): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'get_user_by_github_id',
		timestamp: new Date().toISOString(),
		githubId,
	}));

	// Look up user ID from githubId index
	const userId = await USERS.get(`index:github:${githubId}`);
	
	if (!userId) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'get_user_by_github_id_not_found',
			timestamp: new Date().toISOString(),
			githubId,
		}));
		return null;
	}
	
	return getUserById(userId);
}

export async function getUserById(userId: string): Promise<User | null> {
	const userData = await USERS.get<User>(`profile:${userId}`, "json");
	
	if (!userData) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'get_user_by_id_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
	}
	
	return userData;
}

export async function addSessionToUser(userId: string, sessionId: string, expiresAt: Date): Promise<void> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'add_session',
		timestamp: new Date().toISOString(),
		userId,
		sessionId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'add_session_error',
			timestamp: new Date().toISOString(),
			userId,
			error: 'User not found',
		}));
		throw new Error("User not found");
	}

	// Initialize sessions array if it doesn't exist
	if (!user.sessions) {
		user.sessions = [];
	}

	// Clean up expired sessions
	const now = Date.now();
	const expiredCount = user.sessions.filter(s => new Date(s.expiresAt).getTime() <= now).length;
	user.sessions = user.sessions.filter(s => new Date(s.expiresAt).getTime() > now);

	// Add new session
	user.sessions.push({
		id: sessionId,
		expiresAt: expiresAt.toISOString()
	});

	// Update user in KV
	await USERS.put(`profile:${userId}`, JSON.stringify(user));

	if (expiredCount > 0) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'add_session_cleaned_expired',
			timestamp: new Date().toISOString(),
			userId,
			expiredSessionsCleaned: expiredCount,
		}));
	}
}

export async function removeSessionFromUser(userId: string, sessionId: string): Promise<void> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'remove_session',
		timestamp: new Date().toISOString(),
		userId,
		sessionId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'remove_session_user_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return;
	}

	if (!user.sessions) {
		return;
	}

	// Remove the session
	user.sessions = user.sessions.filter(s => s.id !== sessionId);

	// Update user in KV
	await USERS.put(`profile:${userId}`, JSON.stringify(user));
}

export async function cleanExpiredSessionsFromUser(userId: string): Promise<string[]> {
	const user = await getUserById(userId);
	if (!user || !user.sessions) {
		return [];
	}

	const now = Date.now();
	const expiredSessionIds = user.sessions
		.filter(s => new Date(s.expiresAt).getTime() <= now)
		.map(s => s.id);

	if (expiredSessionIds.length > 0) {
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'clean_expired_sessions',
			timestamp: new Date().toISOString(),
			userId,
			expiredSessionCount: expiredSessionIds.length,
		}));

		// Remove expired sessions from user object
		user.sessions = user.sessions.filter(s => new Date(s.expiresAt).getTime() > now);
		await USERS.put(`profile:${userId}`, JSON.stringify(user));
	}

	return expiredSessionIds;
}

// Create a pre-registered user (without OAuth details yet)
export async function createPreRegisteredUser(username: string, email: string, role: UserRole, authSource: AuthSource): Promise<User> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'create_preregistered_user',
		timestamp: new Date().toISOString(),
		username,
		email,
		role,
		authSource,
	}));

	try {
		// Generate a unique user ID using UUID without dashes
		const userId = crypto.randomUUID().replace(/-/g, '');
		
		const now = new Date().toISOString();
		
		const user: User = {
			id: userId,
			email,
			username,
			role,
			authSource,
			isActive: true,
			createdAt: now,
			updatedAt: now
		};
		
		// Store user profile
		await USERS.put(`profile:${userId}`, JSON.stringify(user));
		
		// Create secondary index by username for lookups
		await USERS.put(`index:username:${username.toLowerCase()}`, userId);
		
		console.log(JSON.stringify({
			type: 'user_operation',
			operation: 'create_preregistered_user_success',
			timestamp: new Date().toISOString(),
			userId,
			username,
		}));

		return user;
	} catch (error) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'create_preregistered_user_error',
			timestamp: new Date().toISOString(),
			username,
			error: error instanceof Error ? error.message : String(error),
		}));
		throw error;
	}
}

// Update user details when they first login (populate OAuth ID)
export async function updateUserOnFirstLogin(userId: string, githubId: number, email: string): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'update_user_first_login',
		timestamp: new Date().toISOString(),
		userId,
		githubId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'update_user_first_login_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return null;
	}
	
	// Update user with OAuth details
	user.githubId = githubId;
	user.email = email; // Update email in case it changed
	user.updatedAt = new Date().toISOString();
	
	// Store updated user
	await USERS.put(`profile:${userId}`, JSON.stringify(user));
	
	// Create secondary index by githubId for future lookups
	if (user.authSource === 'github') {
		await USERS.put(`index:github:${githubId}`, userId);
	}
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'update_user_first_login_success',
		timestamp: new Date().toISOString(),
		userId,
		username: user.username,
	}));

	return user;
}

// Update user role
export async function updateUserRole(userId: string, role: UserRole): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'update_user_role',
		timestamp: new Date().toISOString(),
		userId,
		newRole: role,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'update_user_role_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return null;
	}
	
	const oldRole = user.role;
	user.role = role;
	user.updatedAt = new Date().toISOString();
	
	await USERS.put(`profile:${userId}`, JSON.stringify(user));
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'update_user_role_success',
		timestamp: new Date().toISOString(),
		userId,
		username: user.username,
		oldRole,
		newRole: role,
	}));

	return user;
}

// Deactivate a user
export async function deactivateUser(userId: string): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'deactivate_user',
		timestamp: new Date().toISOString(),
		userId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'deactivate_user_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return null;
	}
	
	user.isActive = false;
	user.updatedAt = new Date().toISOString();
	
	await USERS.put(`profile:${userId}`, JSON.stringify(user));
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'deactivate_user_success',
		timestamp: new Date().toISOString(),
		userId,
		username: user.username,
	}));

	return user;
}

// Reactivate a user
export async function reactivateUser(userId: string): Promise<User | null> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'reactivate_user',
		timestamp: new Date().toISOString(),
		userId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'reactivate_user_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return null;
	}
	
	user.isActive = true;
	user.updatedAt = new Date().toISOString();
	
	await USERS.put(`profile:${userId}`, JSON.stringify(user));
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'reactivate_user_success',
		timestamp: new Date().toISOString(),
		userId,
		username: user.username,
	}));

	return user;
}

// List all users (for admin)
export async function listAllUsers(): Promise<User[]> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'list_all_users',
		timestamp: new Date().toISOString(),
	}));

	const users: User[] = [];
	
	// List all user profile keys
	const list = await USERS.list({ prefix: "profile:" });
	
	for (const key of list.keys) {
		const userData = await USERS.get<User>(key.name, "json");
		if (userData) {
			users.push(userData);
		}
	}
	
	// Sort by creation date (newest first)
	users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'list_all_users_success',
		timestamp: new Date().toISOString(),
		userCount: users.length,
	}));

	return users;
}

// Delete a user completely
export async function deleteUser(userId: string): Promise<boolean> {
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'delete_user',
		timestamp: new Date().toISOString(),
		userId,
	}));

	const user = await getUserById(userId);
	if (!user) {
		console.error(JSON.stringify({
			type: 'user_operation',
			operation: 'delete_user_not_found',
			timestamp: new Date().toISOString(),
			userId,
		}));
		return false;
	}
	
	// Delete user record
	await USERS.delete(`profile:${userId}`);
	
	// Delete username index
	await USERS.delete(`index:username:${user.username.toLowerCase()}`);
	
	// Delete githubId index if it exists
	if (user.githubId) {
		await USERS.delete(`index:github:${user.githubId}`);
	}
	
	console.log(JSON.stringify({
		type: 'user_operation',
		operation: 'delete_user_success',
		timestamp: new Date().toISOString(),
		userId,
		username: user.username,
	}));

	// Note: Sessions will expire naturally, but we could also invalidate them here
	// by calling invalidateUserSessions if needed
	
	return true;
}

export type UserRole = 'admin' | 'editor' | 'reader';
export type AuthSource = 'github' | 'google' | 'microsoft';

export interface User {
	id: string;
	email: string;
	githubId?: number; // Optional for pre-registered users
	username: string;
	role: UserRole;
	authSource: AuthSource;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	sessions?: UserSession[];
}

interface UserSession {
	id: string;
	expiresAt: string;
}