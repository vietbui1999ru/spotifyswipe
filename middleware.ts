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

export function middleware(request: NextRequest) {
	// Redirect localhost → 127.0.0.1 (Spotify banned localhost redirect URIs)
	const host = request.headers.get("host") ?? "";
	if (host.startsWith("localhost")) {
		const url = request.nextUrl.clone();
		url.hostname = "127.0.0.1";
		return NextResponse.redirect(url, 308);
	}

	return NextResponse.next();
}
