import type { User } from "@/server/user";
import { getEnv } from "@/utils/env";

export interface ContactInfo {
	email: string | null;
	phone: string | null;
}

/**
 * Get personal contact information.
 * Returns contact info only if user is authenticated (logged in).
 * @param user - The authenticated user, or null if not logged in
 * @returns ContactInfo object with email and phone (null if not set or not authenticated)
 */
export async function getContactInfo(user: User | null): Promise<ContactInfo> {
	// Only return contact info if user is authenticated
	if (!user) {
		return {
			email: null,
			phone: null
		};
	}

	// Use the async env helper which also attempts a dynamic Cloudflare import
	// when running in the worker runtime.
	const email = getEnv("PERSONAL_EMAIL");
	const phone = getEnv("PERSONAL_PHONE");

	return {
		email: email || null,
		phone: phone || null
	};
}
