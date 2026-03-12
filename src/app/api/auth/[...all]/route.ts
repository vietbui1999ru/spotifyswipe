import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	/**
	 * Workaround for "Bad escaped character in JSON" error.
	 *
	 * On Vercel serverless + Next.js 16 Turbopack, the body
	 * ReadableStream can produce corrupted bytes when read via
	 * request.json(). Reading via arrayBuffer → UTF-8 decode →
	 * new Request avoids the stream corruption.
	 */
	const buffer = await request.arrayBuffer();
	const body = new TextDecoder("utf-8").decode(buffer);

	const freshRequest = new Request(request.url, {
		method: request.method,
		headers: request.headers,
		body,
	});

	return handler.POST(freshRequest);
}
