import { type NextRequest, NextResponse } from "next/server";

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};

const protectedPaths = [
	"/dashboard",
	"/playlist",
	"/shareboard",
	"/onboarding",
	"/profile",
	"/admin",
];

export function middleware(request: NextRequest) {
	// Dev only: redirect localhost → 127.0.0.1 (Spotify banned localhost redirect URIs)
	if (process.env.NODE_ENV === "development") {
		const host = request.headers.get("host") ?? "";
		if (host.startsWith("localhost")) {
			const url = request.nextUrl.clone();
			url.hostname = "127.0.0.1";
			return NextResponse.redirect(url, 308);
		}
	}

	// Route protection: redirect unauthenticated users to /sign-in
	const { pathname } = request.nextUrl;
	const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

	if (isProtected) {
		const sessionToken = request.cookies.get("better-auth.session_token");
		if (!sessionToken?.value) {
			const signInUrl = new URL("/sign-in", request.nextUrl.origin);
			signInUrl.searchParams.set("callbackUrl", pathname);
			return NextResponse.redirect(signInUrl);
		}
	}

	return NextResponse.next();
}
