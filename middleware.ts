import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

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

export const runtime = "nodejs";

const protectedRoutes = ["/dashboard", "/playlist", "/shareboard"];

export async function middleware(request: NextRequest) {
	const session = await auth();
	const { pathname } = request.nextUrl;

	const isProtected = protectedRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);

	if (isProtected && !session?.user) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}
