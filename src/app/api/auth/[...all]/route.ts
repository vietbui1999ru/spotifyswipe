import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
	// Canary: confirm this build is live
	const url = new URL(request.url);
	if (url.searchParams.get("_ping") === "1") {
		return new Response(JSON.stringify({ live: true, build: "f9b14c3-fix2" }), {
			headers: { "content-type": "application/json" },
		});
	}
	return handler.GET(request);
}

export async function POST(request: Request) {
	/**
	 * Workaround for "Bad escaped character in JSON" error.
	 *
	 * On Vercel serverless + Next.js 16, the body ReadableStream
	 * passed to route handlers can produce corrupted bytes when
	 * read via request.json(). Reading via arrayBuffer → UTF-8
	 * decode → new Request avoids the corruption.
	 */
	try {
		const buffer = await request.arrayBuffer();
		const body = new TextDecoder("utf-8").decode(buffer);

		const freshRequest = new Request(request.url, {
			method: request.method,
			headers: request.headers,
			body,
		});

		return handler.POST(freshRequest);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
			}),
			{ status: 500, headers: { "content-type": "application/json" } },
		);
	}
}
