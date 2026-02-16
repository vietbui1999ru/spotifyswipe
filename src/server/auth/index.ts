import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "~/env";
import { db } from "~/server/db";

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
	baseURL: "http://127.0.0.1:3000",
	basePath: "/api/auth",
	secret: env.AUTH_SECRET,
	trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],

	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
	},

	socialProviders: {
		spotify: {
			clientId: env.AUTH_SPOTIFY_ID,
			clientSecret: env.AUTH_SPOTIFY_SECRET,
			redirectURI: "http://127.0.0.1:3000/api/auth/callback/spotify",
			scope: SPOTIFY_SCOPES,
		},
		google: {
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
			redirectURI: "http://127.0.0.1:3000/api/auth/callback/google",
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
