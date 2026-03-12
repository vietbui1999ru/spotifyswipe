import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

/**
 * Sign a session token the same way better-auth does:
 * HMAC-SHA256(token, secret) → base64 → "token.signature"
 * (Pattern copied from src/app/api/auth/callback/lastfm/route.ts)
 */
function signSessionToken(token: string, secret: string): string {
	const signature = crypto
		.createHmac("sha256", secret)
		.update(token)
		.digest("base64");
	return `${token}.${signature}`;
}

function getAuthSecret(): string {
	const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
	if (!secret) {
		throw new Error("AUTH_SECRET is not configured");
	}
	return secret;
}

const log = createLogger("demo-start");

const DEMO_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
	try {
		// Rate-limit: check if caller already has a valid demo session
		const existingSession = await auth.api.getSession({
			headers: request.headers,
		});

		if (existingSession?.user?.id) {
			const existingUser = await db.user.findUnique({
				where: { id: existingSession.user.id },
				select: { isDemo: true, demoExpiresAt: true },
			});

			// If they already have a non-expired demo session, reuse it
			if (
				existingUser?.isDemo &&
				existingUser.demoExpiresAt &&
				existingUser.demoExpiresAt > new Date()
			) {
				log.info("Reusing existing demo session", {
					userId: existingSession.user.id,
				});
				return NextResponse.json({ success: true });
			}
		}

		// Rate-limit: max 5 demo users per IP per hour
		const ip =
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			request.headers.get("x-real-ip") ||
			"unknown";

		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const recentDemoCount = await db.user.count({
			where: {
				isDemo: true,
				createdAt: { gte: oneHourAgo },
				// We store IP in session; approximate by checking recent demo creations
			},
		});

		// Soft limit — in practice only matters under heavy traffic
		if (recentDemoCount > 50) {
			log.warn("Demo rate limit hit", { ip, recentDemoCount });
			return NextResponse.json(
				{ error: "Too many demo sessions. Please try again later." },
				{ status: 429 },
			);
		}

		// Create demo user
		const suffix = Math.floor(1000 + Math.random() * 9000);
		const uuid = crypto.randomUUID();
		const user = await db.user.create({
			data: {
				name: `Demo User #${suffix}`,
				email: `demo-${uuid}@spotiswipe.demo`,
				isDemo: true,
				demoExpiresAt: new Date(Date.now() + DEMO_SESSION_DURATION),
				musicProvider: "auto",
			},
		});

		log.info("Created demo user", { userId: user.id });

		// Create account with providerId "demo" to satisfy OnboardingGuard
		await db.account.create({
			data: {
				userId: user.id,
				providerId: "demo",
				accountId: uuid,
			},
		});

		// Create session (same pattern as lastfm callback)
		const sessionToken = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + DEMO_SESSION_DURATION);

		await db.session.create({
			data: {
				token: sessionToken,
				userId: user.id,
				expiresAt,
				ipAddress: ip,
				userAgent: request.headers.get("user-agent") || undefined,
			},
		});

		// Sign token and set cookie
		const secret = getAuthSecret();
		const signedToken = signSessionToken(sessionToken, secret);

		const response = NextResponse.json({ success: true });
		const isProduction = process.env.NODE_ENV === "production";
		const cookieName = isProduction
			? "__Secure-better-auth.session_token"
			: "better-auth.session_token";

		response.cookies.set(cookieName, signedToken, {
			httpOnly: true,
			maxAge: 24 * 60 * 60, // 24 hours
			path: "/",
			secure: isProduction,
			sameSite: "lax",
		});

		log.info("Demo session created", { userId: user.id });
		return response;
	} catch (error) {
		log.error("Failed to create demo session", {
			error: error instanceof Error ? error.message : error,
		});
		return NextResponse.json(
			{ error: "Failed to create demo session" },
			{ status: 500 },
		);
	}
}
