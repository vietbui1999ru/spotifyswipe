import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

// Force NEXTAUTH_URL to be used instead of auto-detecting from request
// This is critical for local development with 127.0.0.1
const configWithUrl = {
	...authConfig,
	// Explicitly set the base URL from environment
	basePath: "/api/auth",
};

const {
	auth: uncachedAuth,
	handlers,
	signIn,
	signOut,
} = NextAuth(configWithUrl);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
