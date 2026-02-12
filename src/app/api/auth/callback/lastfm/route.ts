import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getLastfmUserProfile, getSessionKey } from "~/server/auth/lastfm";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

const log = createLogger("lastfm-callback");

/**
 * Custom Last.fm callback handler
 * Handles Last.fm's implicit OAuth flow (token in URL query param)
 * Bypasses Auth.js OAuth validation which doesn't support implicit flows
 *
 * Shared helpers (generateApiSig, getSessionKey, getLastfmUserProfile) live
 * in ~/server/auth/lastfm.ts to avoid duplication.
 */

export async function GET(request: NextRequest) {
	try {
		const token = request.nextUrl.searchParams.get("token");

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

		const providerAccountId = profile.user.name;

		if (!providerAccountId) {
			throw new Error("Last.fm user profile missing name field");
		}

		const user = await db.user.upsert({
			where: { email: `${profile.user.name}@last.fm` },
			update: {
				name: profile.user.name || profile.user.realname,
				image:
					profile.user.image?.find((img) => img.size === "large")?.["#text"] ||
					null,
			},
			create: {
				email: `${profile.user.name}@last.fm`,
				name: profile.user.name || profile.user.realname,
				image:
					profile.user.image?.find((img) => img.size === "large")?.["#text"] ||
					null,
			},
		});

		log.info("Created/updated user", { userId: user.id });

		await db.account.upsert({
			where: {
				provider_providerAccountId: {
					provider: "lastfm",
					providerAccountId: providerAccountId,
				},
			},
			update: {
				access_token: sessionKey,
				token_type: "Bearer",
			},
			create: {
				userId: user.id,
				provider: "lastfm",
				providerAccountId: providerAccountId,
				type: "oauth",
				access_token: sessionKey,
				token_type: "Bearer",
			},
		});

		log.info("Created/updated account with session key");

		const sessionToken = crypto.randomUUID();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		await db.session.create({
			data: {
				sessionToken,
				userId: user.id,
				expires,
			},
		});

		log.info("Created session token");

		const response = NextResponse.redirect(
			new URL("/dashboard", request.nextUrl.origin),
		);

		response.cookies.set("next-auth.session-token", sessionToken, {
			httpOnly: true,
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: "/",
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
		});

		log.info("User authenticated successfully, redirecting to dashboard");

		return response;
	} catch (error) {
		log.error("Callback error", {
			error: error instanceof Error ? error.message : error,
		});
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		const url = new URL("/", request.nextUrl.origin);
		url.searchParams.set("error", encodeURIComponent(errorMessage));
		return NextResponse.redirect(url);
	}
}
