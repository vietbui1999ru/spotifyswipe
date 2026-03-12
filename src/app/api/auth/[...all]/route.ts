import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	/**
	 * Workaround: better-auth/better-call reads the request body via
	 * `request.json()`. On certain runtimes (Vercel serverless, Next.js 16
	 * Turbopack cold-starts), the raw body stream can produce bytes that
	 * fail JSON.parse with "Bad escaped character". Re-creating the Request
	 * from the text body avoids the corrupt stream.
	 */
	const body = await request.text();
	const freshRequest = new Request(request.url, {
		method: request.method,
		headers: request.headers,
		body,
	});

	return handler.POST(freshRequest);
}
