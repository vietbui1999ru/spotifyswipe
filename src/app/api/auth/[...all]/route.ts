import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	try {
		// Log that we reached the handler
		console.log("[AUTH-DIAG] POST handler invoked:", request.url);

		// Read and re-create request to ensure body is consumable
		const body = await request.text();
		console.log("[AUTH-DIAG] Body:", body.substring(0, 200));

		const newRequest = new Request(request.url, {
			method: request.method,
			headers: request.headers,
			body,
		});

		const response = await handler.POST(newRequest);
		console.log("[AUTH-DIAG] Response status:", response.status);

		if (response.status >= 400) {
			const cloned = response.clone();
			const respBody = await cloned.text();
			console.log("[AUTH-DIAG] Error response body:", respBody);
		}

		return response;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("[AUTH-DIAG] Caught exception:", msg);
		console.error(
			"[AUTH-DIAG] Stack:",
			error instanceof Error ? error.stack : "none",
		);
		return new Response(JSON.stringify({ error: msg, source: "catch" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		});
	}
}
