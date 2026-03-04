import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { getLastfmUserProfile, getSessionKey } from "~/server/auth/lastfm";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

/**
 * Sign a session token the same way better-auth/better-call does:
 * HMAC-SHA256(token, secret) → standard base64 → "token.signature"
 */
function signSessionToken(token: string, secret: string): string {
	const signature = crypto
		.createHmac("sha256", secret)
		.update(token)
		.digest("base64");
	return `${token}.${signature}`;
}

/**
 * Get the auth secret matching better-auth's resolution order.
 */
function getAuthSecret(): string {
	const secret =
		env.AUTH_SECRET ||
		process.env.BETTER_AUTH_SECRET ||
		process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error("AUTH_SECRET is not configured");
	}
	return secret;
}

const log = createLogger("lastfm-callback");

/**
 * Custom Last.fm callback handler
 * Handles Last.fm's implicit OAuth flow (token in URL query param)
 * Last.fm uses a non-standard auth flow (api_key + MD5 signatures) that
 * better-auth's generic-oauth plugin can't handle, so we keep this custom route.
 *
 * Supports account linking: if a user is already signed in (e.g. via Spotify),
 * the Last.fm account will be linked to the existing user rather than creating a new one.
 */

export async function GET(request: NextRequest) {
	try {
		const token = request.nextUrl.searchParams.get("token");
		const redirectParam = request.nextUrl.searchParams.get("redirect");
		// Validate redirect is a relative path to prevent open redirect
		// Block protocol-relative URLs like "//evil.com"
		const redirectTo =
			redirectParam?.startsWith("/") && !redirectParam.startsWith("//")
				? redirectParam
				: "/dashboard";

		if (!token) {
			log.error("No token in callback URL");
			const url = new URL("/", request.nextUrl.origin);
			url.searchParams.set("error", "NoToken");
			return NextResponse.redirect(url);
		}

		log.info("Received callback with token");

		const apiKey = process.env.LASTFM_API_KEY;
		const apiSecret = process.env.LASTFM_API_SECRET;

		if (!apiKey || !apiSecret) {
			log.error("API credentials not configured");
			const url = new URL("/", request.nextUrl.origin);
			url.searchParams.set("error", "MissingCredentials");
			return NextResponse.redirect(url);
		}

		log.info("Exchanging token for session key");
		const sessionKey = await getSessionKey(token, apiKey, apiSecret);
		log.info("Successfully got session key");

		log.info("Fetching user profile");
		const profile = await getLastfmUserProfile(apiKey, sessionKey);
		log.info("Got user profile", {
			name: profile.user.name,
			realname: profile.user.realname,
		});

		const accountId = profile.user.name;

		if (!accountId) {
			throw new Error("Last.fm user profile missing name field");
		}

		// Check if user is already signed in (e.g. via Spotify) for account linking
		const existingSession = await auth.api.getSession({
			headers: request.headers,
		});
		let user: { id: string };

		if (existingSession?.user?.id) {
			// User is already authenticated — link Last.fm to their existing account
			log.info("Linking Last.fm account to existing user", {
				userId: existingSession.user.id,
			});
			user = await db.user.update({
				where: { id: existingSession.user.id },
				data: {
					image:
						profile.user.image?.find((img) => img.size === "large")?.[
							"#text"
						] || undefined,
				},
			});
		} else {
			// No existing session — upsert user as before
			user = await db.user.upsert({
				where: { email: `lastfm+${profile.user.name}@spotiswipe.internal` },
				update: {
					name: profile.user.name || profile.user.realname || "Last.fm User",
					image:
						profile.user.image?.find((img) => img.size === "large")?.[
							"#text"
						] || null,
				},
				create: {
					email: `lastfm+${profile.user.name}@spotiswipe.internal`,
					name: profile.user.name || profile.user.realname || "Last.fm User",
					image:
						profile.user.image?.find((img) => img.size === "large")?.[
							"#text"
						] || null,
				},
			});
		}

		log.info("Created/updated user", { userId: user.id });

		// Check if this Last.fm account is already linked to a different user
		const existingAccount = await db.account.findUnique({
			where: {
				providerId_accountId: {
					providerId: "lastfm",
					accountId: accountId,
				},
			},
			select: { userId: true },
		});

		if (existingAccount && existingAccount.userId !== user.id) {
			log.warn("Last.fm account already linked to another user", {
				accountId,
				existingUserId: existingAccount.userId,
				requestingUserId: user.id,
			});
			const url = new URL("/", request.nextUrl.origin);
			url.searchParams.set(
				"error",
				"This Last.fm account is already linked to another user",
			);
			return NextResponse.redirect(url);
		}

		await db.account.upsert({
			where: {
				providerId_accountId: {
					providerId: "lastfm",
					accountId: accountId,
				},
			},
			update: {
				accessToken: sessionKey,
				userId: user.id,
			},
			create: {
				userId: user.id,
				providerId: "lastfm",
				accountId: accountId,
				accessToken: sessionKey,
			},
		});

		log.info("Created/updated account with session key");

		// Only create a new session cookie if user wasn't already logged in
		if (!existingSession?.user?.id) {
			const sessionToken = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

			await db.session.create({
				data: {
					token: sessionToken,
					userId: user.id,
					expiresAt,
				},
			});

			log.info("Created session token");

			const response = NextResponse.redirect(
				new URL(redirectTo, request.nextUrl.origin),
			);

			// Sign the token with HMAC-SHA256 matching better-auth's format:
			// "token.base64(hmac_sha256(token, secret))"
			const secret = getAuthSecret();
			const signedToken = signSessionToken(sessionToken, secret);

			response.cookies.set("better-auth.session_token", signedToken, {
				httpOnly: true,
				maxAge: 30 * 24 * 60 * 60, // 30 days
				path: "/",
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
			});

			log.info("User authenticated successfully", { redirectTo });
			return response;
		}

		// Already logged in — just redirect
		log.info("Last.fm account linked", { redirectTo });
		return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin));
	} catch (error) {
		log.error("Callback error", {
			error: error instanceof Error ? error.message : error,
		});
		const url = new URL("/", request.nextUrl.origin);
		url.searchParams.set("error", "AuthCallbackFailed");
		return NextResponse.redirect(url);
	}
}
