"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// No explicit baseURL — defaults to window.location.origin
	// This ensures requests are always same-origin (no CORS issues)
	// regardless of whether the browser is on localhost or 127.0.0.1
});

export const { useSession, signIn, signOut, signUp } = authClient;
