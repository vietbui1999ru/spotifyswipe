import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "~/env";
import { db } from "~/server/db";

/**
 * Resolve the canonical app URL.
 * - Production: uses VERCEL_URL (auto-provided by Vercel) or BETTER_AUTH_URL (manual override)
 * - Development: falls back to http://127.0.0.1:3000
 */
function getBaseUrl(): string {
	if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return "http://127.0.0.1:3000";
}

const baseUrl = getBaseUrl();

/**
 * Build the list of origins better-auth should trust.
 * Vercel exposes several auto-URLs that can differ from each other:
 *   VERCEL_URL              – deployment-specific (changes every deploy)
 *   VERCEL_PROJECT_PRODUCTION_URL – stable production domain
 *   VERCEL_BRANCH_URL       – branch-specific preview URL
 */
function getTrustedOrigins(): string[] {
	const origins = new Set([
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		baseUrl,
	]);

	for (const envVar of [
		"VERCEL_URL",
		"VERCEL_PROJECT_PRODUCTION_URL",
		"VERCEL_BRANCH_URL",
	]) {
		const value = process.env[envVar];
		if (value) {
			origins.add(`https://${value}`);
		}
	}

	return [...origins];
}

const SPOTIFY_SCOPES = [
	"user-read-private",
	"user-read-email",
	"streaming",
	"user-read-playback-state",
	"user-modify-playback-state",
	"user-read-recently-played",
	"user-top-read",
	"user-library-read",
	"playlist-read-private",
	"playlist-modify-public",
	"playlist-modify-private",
];

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	baseURL: baseUrl,
	basePath: "/api/auth",
	secret: env.AUTH_SECRET,
	trustedOrigins: getTrustedOrigins(),

	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},

	socialProviders: {
		spotify: {
			clientId: env.AUTH_SPOTIFY_ID,
			clientSecret: env.AUTH_SPOTIFY_SECRET,
			redirectURI: `${baseUrl}/api/auth/callback/spotify`,
			scope: SPOTIFY_SCOPES,
		},
		google: {
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
			redirectURI: `${baseUrl}/api/auth/callback/google`,
		},
	},

	plugins: [nextCookies()],

	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["spotify", "lastfm", "google"],
			allowDifferentEmails: true,
		},
	},
});
