import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	try {
		const response = await handler.POST(request);
		return response;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;
		console.error("[AUTH] POST error:", msg);
		if (stack) console.error("[AUTH] Stack:", stack);
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}
