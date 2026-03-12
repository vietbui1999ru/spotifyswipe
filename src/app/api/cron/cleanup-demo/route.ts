import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { createLogger } from "~/server/logger";

const log = createLogger("cron-cleanup-demo");

/** Shared cleanup logic — deletes expired demo users (with 1h grace period). */
export async function cleanupExpiredDemoUsers() {
	const gracePeriod = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

	const result = await db.user.deleteMany({
		where: {
			isDemo: true,
			demoExpiresAt: {
				not: null,
				lt: gracePeriod,
			},
		},
	});

	return result.count;
}

export async function GET(request: NextRequest) {
	// Verify CRON_SECRET
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
		log.warn("Unauthorized cron attempt");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const deletedCount = await cleanupExpiredDemoUsers();
		log.info("Demo cleanup complete", { deletedCount });
		return NextResponse.json({ success: true, deletedCount });
	} catch (error) {
		log.error("Demo cleanup failed", {
			error: error instanceof Error ? error.message : error,
		});
		return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
	}
}
