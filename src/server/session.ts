import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { getEnv } from "@/utils/env";
import { getUserById, addSessionToUser, removeSessionFromUser, cleanExpiredSessionsFromUser } from "./user";

import type { User } from "./user";
import type { APIContext } from "astro";

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessions = getEnv("SESSIONS");
	if (!sessions) {
		throw new Error("SESSIONS KV namespace is not configured");
	}

	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const sessionData = await sessions.get<StoredSession>(`token:${sessionId}`, "json");

	if (!sessionData) {
		return { session: null, user: null };
	}

	const session: Session = {
		id: sessionId,
		userId: sessionData.userId,
		expiresAt: new Date(sessionData.expiresAt)
	};

	// Check if session is expired
	if (Date.now() >= session.expiresAt.getTime()) {
		await sessions.delete(`token:${sessionId}`);
		await removeSessionFromUser(session.userId, sessionId);
		return { session: null, user: null };
	}

	// Get user data
	const user = await getUserById(session.userId);
	if (!user) {
		await sessions.delete(`token:${sessionId}`);
		return { session: null, user: null };
	}

	// Clean up any expired sessions from the user object
	const expiredSessionIds = await cleanExpiredSessionsFromUser(session.userId);
	
	// Delete expired sessions from KV
	if (expiredSessionIds.length > 0) {
		await Promise.all(
			expiredSessionIds.map(id => sessions.delete(`token:${id}`))
		);
	}

	// Extend session if it's close to expiring (within 15 days)
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await sessions.put(
			`token:${sessionId}`,
			JSON.stringify({
				userId: session.userId,
				expiresAt: session.expiresAt.toISOString()
			}),
			{
				expirationTtl: 60 * 60 * 24 * 30 // 30 days
			}
		);
		// Update the session expiration in the user object too
		await addSessionToUser(session.userId, sessionId, session.expiresAt);
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	// Get session data to find userId
	const sessions = getEnv("SESSIONS");
	if (!sessions) {
		throw new Error("SESSIONS KV namespace is not configured");
	}
	
	const sessionData = await sessions.get<StoredSession>(`token:${sessionId}`, "json");

	// Delete the session from KV
	await sessions.delete(`token:${sessionId}`);
	
	// Remove session from user if we found the session data
	if (sessionData) {
		await removeSessionFromUser(sessionData.userId, sessionId);
	}
}

export async function invalidateUserSessions(userId: string): Promise<void> {
	// List all session tokens
	const sessions = getEnv("SESSIONS");
	if (!sessions) {
		throw new Error("SESSIONS KV namespace is not configured");
	}

	const list = await sessions.list({ prefix: "token:" });
	const deletePromises = [];
	
	for (const key of list.keys) {
		const sessionData = await sessions.get<StoredSession>(key.name, "json");
		if (sessionData && sessionData.userId === userId) {
			deletePromises.push(sessions.delete(key.name));
		}
	}
	
	await Promise.all(deletePromises);
}

export function setSessionTokenCookie(context: APIContext, token: string, expiresAt: Date): void {
	context.cookies.set("session", token, {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(context: APIContext): void {
	context.cookies.set("session", "", {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: 0
	});
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	const token = encodeBase32(tokenBytes).toLowerCase();
	return token;
}

export async function createSession(token: string, userId: string): Promise<Session> {
	const sessions = getEnv("SESSIONS");
	if (!sessions) {
		throw new Error("SESSIONS KV namespace is not configured");
	}
	
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	
	// Store session in KV
	await sessions.put(
		`token:${sessionId}`,
		JSON.stringify({
			userId: session.userId,
			expiresAt: session.expiresAt.toISOString()
		}),
		{
			expirationTtl: 60 * 60 * 24 * 30 // 30 days
		}
	);
	
	// Add session reference to user and clean up expired sessions
	await addSessionToUser(userId, sessionId, session.expiresAt);
	
	return session;
}

export interface Session {
	id: string;
	expiresAt: Date;
	userId: string;
}

interface StoredSession {
	userId: string;
	expiresAt: string;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };