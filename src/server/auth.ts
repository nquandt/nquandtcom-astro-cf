import type { User, UserRole } from "./user";
import type { APIContext } from "astro";

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, role: UserRole): boolean {
	if (!user) return false;
	return user.role === role;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
	if (!user) return false;
	return roles.includes(user.role);
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User | null): boolean {
	return hasRole(user, 'admin');
}

/**
 * Check if a user can edit content (admin or editor)
 */
export function canEdit(user: User | null): boolean {
	return hasAnyRole(user, ['admin', 'editor']);
}

/**
 * Check if a user can read content (any authenticated user)
 */
export function canRead(user: User | null): boolean {
	return user !== null && user.isActive;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export function requireAuth(context: APIContext): User {
	if (!context.locals.user || !context.locals.session) {
		throw new Error("Authentication required");
	}
	
	if (!context.locals.user.isActive) {
		throw new Error("Account is deactivated");
	}
	
	return context.locals.user;
}

/**
 * Require admin role - throw error if not admin
 */
export function requireAdmin(context: APIContext): User {
	const user = requireAuth(context);
	
	if (!isAdmin(user)) {
		throw new Error("Admin access required");
	}
	
	return user;
}

/**
 * Require editor or admin role - throw error if neither
 */
export function requireEditor(context: APIContext): User {
	const user = requireAuth(context);
	
	if (!canEdit(user)) {
		throw new Error("Editor or admin access required");
	}
	
	return user;
}
