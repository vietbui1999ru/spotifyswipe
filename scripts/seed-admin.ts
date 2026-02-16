/**
 * Seed admin script — promotes an existing user to admin by email.
 *
 * Usage:
 *   bunx tsx scripts/seed-admin.ts your-email@example.com
 *
 * This is the ONLY way to create the first admin. Subsequent admins
 * should be managed through the admin tRPC router (setUserRole).
 */
import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error("Usage: bunx tsx scripts/seed-admin.ts <email>");
		process.exit(1);
	}

	const user = await db.user.findUnique({ where: { email } });
	if (!user) {
		console.error(`No user found with email: ${email}`);
		process.exit(1);
	}

	if (user.role === "admin") {
		console.log(`User ${email} is already an admin.`);
		return;
	}

	await db.user.update({
		where: { id: user.id },
		data: { role: "admin" },
	});

	console.log(`Successfully promoted ${email} (${user.name}) to admin.`);
}

main()
	.catch((e) => {
		console.error("Failed:", e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
