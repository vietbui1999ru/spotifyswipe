import type { OAuthConfig } from "next-auth/providers";
import type { LastfmProfile } from "./lastfm";

/**
 * Last.fm OAuth Provider for Next Auth
 *
 * Last.fm OAuth flow:
 * 1. User redirected to Last.fm auth URL with API key and callback
 * 2. User authorizes, Last.fm redirects back with token param
 * 3. Exchange token for session key via auth.getSession API
 * 4. Store session key for authenticated API calls
 *
 * Shared helpers (generateApiSig, getSessionKey, getLastfmUserProfile) live
 * in ~/server/auth/lastfm.ts to avoid duplication.
 */

export const lastfmProvider: OAuthConfig<LastfmProfile> = {
	id: "lastfm",
	name: "Last.fm",
	type: "oauth",
	version: "2.0",

	// Set clientId/Secret to Last.fm credentials
	// NOTE: These are used for the auth link generation, but the actual OAuth callback
	// is handled by the custom route at /api/auth/callback/lastfm/route.ts
	// This avoids Auth.js trying to validate the implicit flow
	clientId: process.env.LASTFM_API_KEY || "",
	clientSecret: process.env.LASTFM_API_SECRET || "",

	// Last.fm authorization endpoint
	authorization: {
		url: "https://www.last.fm/api/auth",
		params: {
			api_key: process.env.LASTFM_API_KEY || "",
			cb: `${process.env.NEXTAUTH_URL || "http://127.0.0.1:3000"}/api/auth/callback/lastfm`,
		},
	},

	// Remove OAuth 2.0 standard parameters that Last.fm doesn't support
	authorizationParams() {
		return {
			scope: "",
			response_type: "",
			client_id: "",
			redirect_uri: "",
		};
	},

	// Custom token handler (won't be used - custom route handles callback)
	// But required by Auth.js for validation
	token: {
		url: "https://ws.audioscrobbler.com/2.0",
		async request() {
			// This won't be called because custom route handles the callback
			// Return a placeholder so Auth.js doesn't error
			return {
				tokens: {
					access_token: "",
					token_type: "Bearer",
				},
			};
		},
	},

	// Minimal userinfo for Auth.js validation (won't be called)
	userinfo: {
		url: "https://ws.audioscrobbler.com/2.0",
		async request({ tokens: _tokens }) {
			// Won't be called - custom route returns profile directly
			return {
				user: {
					id: "",
					name: "placeholder",
				},
			};
		},
	},

	// Map Last.fm profile to NextAuth user object
	// Use username as ID since Last.fm doesn't return id field
	profile(profile: LastfmProfile) {
		return {
			id: profile.user.name, // Last.fm uses username as unique identifier
			name: profile.user.name || profile.user.realname || "Last.fm User",
			email: `${profile.user.name}@last.fm`,
			image:
				profile.user.image?.find((img) => img.size === "large")?.["#text"] ||
				null,
		};
	},

	// Last.fm branding
	style: {
		logo: "/lastfm-logo.png",
		bg: "#df0000",
		bgDark: "#df0000",
		text: "#fff",
		textDark: "#fff",
	},

	// Skip all checks - custom route handles validation
	checks: [],
} as OAuthConfig<LastfmProfile>;

export default lastfmProvider;
