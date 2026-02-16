/**
 * Admin user management CLI.
 *
 * Usage:
 *   bunx tsx scripts/admin-users.ts list                    # List all users
 *   bunx tsx scripts/admin-users.ts inspect <email>         # Show user details + linked accounts
 *   bunx tsx scripts/admin-users.ts delete <email>          # Delete user (cascades all data)
 *   bunx tsx scripts/admin-users.ts delete <email> --force  # Skip confirmation
 *   bunx tsx scripts/admin-users.ts set-role <email> admin  # Set user role
 *   bunx tsx scripts/admin-users.ts set-role <email> user   # Set user role
 *   bunx tsx scripts/admin-users.ts unlink <email> spotify  # Remove a provider account link
 *   bunx tsx scripts/admin-users.ts transfer <from> <to>    # Move provider accounts between users
 */
import * as readline from "node:readline";
import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function usage(): never {
	console.log(`
Admin User Management CLI

Commands:
  list                             List all users with account counts
  inspect <email>                  Show full user details + linked providers
  delete <email> [--force]         Delete a user and all their data (cascade)
  set-role <email> <admin|user>    Change a user's role
  unlink <email> <providerId>      Remove a specific provider link from a user
  transfer <from-email> <to-email> Move all provider accounts from one user to another
`);
	process.exit(1);
}

async function confirm(message: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		rl.question(`${message} [y/N] `, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "y");
		});
	});
}

async function findUser(email: string) {
	const user = await db.user.findUnique({
		where: { email },
		include: {
			accounts: {
				select: {
					id: true,
					providerId: true,
					accountId: true,
					accessToken: true,
					createdAt: true,
				},
			},
			_count: {
				select: {
					playlists: true,
					swipeActions: true,
					socialPosts: true,
					likes: true,
					comments: true,
					sessions: true,
					followers: true,
					following: true,
				},
			},
		},
	});
	if (!user) {
		console.error(`No user found with email: ${email}`);
		process.exit(1);
	}
	return user;
}

function printUser(user: Awaited<ReturnType<typeof findUser>>) {
	console.log(`
  ID:       ${user.id}
  Name:     ${user.name}
  Email:    ${user.email}
  Role:     ${user.role}
  Created:  ${user.createdAt.toISOString()}
  Display:  ${user.displayName ?? "(provider default)"}
  Image:    ${user.profileImage ? "custom" : user.image ? "provider" : "none"}`);

	if (user.accounts.length > 0) {
		console.log("  Providers:");
		for (const a of user.accounts) {
			const hasToken = a.accessToken ? "has token" : "no token";
			console.log(
				`    - ${a.providerId} (accountId: ${a.accountId}, ${hasToken})`,
			);
		}
	} else {
		console.log("  Providers: none");
	}

	const c = user._count;
	console.log(
		`  Data:     ${c.playlists} playlists, ${c.swipeActions} swipes, ${c.socialPosts} posts, ${c.sessions} sessions`,
	);
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function list() {
	const users = await db.user.findMany({
		orderBy: { createdAt: "asc" },
		include: {
			accounts: { select: { providerId: true } },
			_count: {
				select: { playlists: true, swipeActions: true, socialPosts: true },
			},
		},
	});

	if (users.length === 0) {
		console.log("No users in database.");
		return;
	}

	console.log(
		`\n  ${"Email".padEnd(35)} ${"Name".padEnd(20)} ${"Role".padEnd(7)} Providers`,
	);
	console.log(
		`  ${"─".repeat(35)} ${"─".repeat(20)} ${"─".repeat(7)} ${"─".repeat(25)}`,
	);

	for (const u of users) {
		const providers = u.accounts.map((a) => a.providerId).join(", ") || "none";
		console.log(
			`  ${u.email.padEnd(35)} ${(u.name ?? "").padEnd(20)} ${u.role.padEnd(7)} ${providers}`,
		);
	}
	console.log(`\n  Total: ${users.length} users\n`);
}

async function inspect(email: string) {
	const user = await findUser(email);
	console.log("\n── User Details ──");
	printUser(user);
	console.log();
}

async function deleteUser(email: string, force: boolean) {
	const user = await findUser(email);

	console.log("\n── User to delete ──");
	printUser(user);

	if (user.role === "admin") {
		console.log("\n  WARNING: This user has admin role.");
	}

	if (!force) {
		const ok = await confirm(
			"\n  This will permanently delete this user and ALL their data. Continue?",
		);
		if (!ok) {
			console.log("  Aborted.");
			return;
		}
	}

	await db.user.delete({ where: { id: user.id } });
	console.log(`\n  Deleted user ${user.email} (${user.id})\n`);
}

async function setRole(email: string, role: string) {
	if (role !== "admin" && role !== "user") {
		console.error('Role must be "admin" or "user"');
		process.exit(1);
	}

	const user = await findUser(email);

	if (user.role === role) {
		console.log(`  User ${email} already has role "${role}".`);
		return;
	}

	await db.user.update({
		where: { id: user.id },
		data: { role },
	});
	console.log(`  Updated ${email}: ${user.role} → ${role}`);
}

async function unlink(email: string, providerId: string) {
	const user = await findUser(email);
	const account = user.accounts.find((a) => a.providerId === providerId);

	if (!account) {
		console.error(`  User ${email} has no ${providerId} account linked.`);
		console.log(
			`  Linked providers: ${user.accounts.map((a) => a.providerId).join(", ") || "none"}`,
		);
		process.exit(1);
	}

	const remaining = user.accounts.filter((a) => a.providerId !== providerId);
	if (remaining.length === 0) {
		console.error(
			"  Cannot unlink the last provider — user would have no way to sign in.",
		);
		process.exit(1);
	}

	await db.account.delete({ where: { id: account.id } });
	console.log(
		`  Unlinked ${providerId} (accountId: ${account.accountId}) from ${email}`,
	);
}

async function transfer(fromEmail: string, toEmail: string) {
	const fromUser = await findUser(fromEmail);
	const toUser = await findUser(toEmail);

	if (fromUser.accounts.length === 0) {
		console.log(`  User ${fromEmail} has no provider accounts to transfer.`);
		return;
	}

	// Check for conflicts
	const toProviders = new Set(toUser.accounts.map((a) => a.providerId));
	const conflicts = fromUser.accounts.filter((a) =>
		toProviders.has(a.providerId),
	);

	if (conflicts.length > 0) {
		console.error(
			`  Conflict: ${toEmail} already has these providers: ${conflicts.map((c) => c.providerId).join(", ")}`,
		);
		console.error(
			"  Use 'unlink' to remove the conflicting provider from the target user first.",
		);
		process.exit(1);
	}

	console.log(`\n  Transfer plan:`);
	console.log(`  From: ${fromEmail} (${fromUser.id})`);
	console.log(`  To:   ${toEmail} (${toUser.id})`);
	console.log("  Accounts to move:");
	for (const a of fromUser.accounts) {
		console.log(`    - ${a.providerId} (accountId: ${a.accountId})`);
	}

	const ok = await confirm("\n  Proceed with transfer?");
	if (!ok) {
		console.log("  Aborted.");
		return;
	}

	await db.account.updateMany({
		where: { userId: fromUser.id },
		data: { userId: toUser.id },
	});

	console.log(
		`\n  Transferred ${fromUser.accounts.length} account(s) from ${fromEmail} → ${toEmail}`,
	);
	console.log(
		`  Note: ${fromEmail} now has NO provider accounts and cannot sign in.`,
	);
	console.log(`  Run: bunx tsx scripts/admin-users.ts delete ${fromEmail}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
	const [command, ...args] = process.argv.slice(2);

	switch (command) {
		case "list":
			await list();
			break;
		case "inspect":
			if (!args[0]) usage();
			await inspect(args[0]);
			break;
		case "delete":
			if (!args[0]) usage();
			await deleteUser(args[0], args.includes("--force"));
			break;
		case "set-role":
			if (!args[0] || !args[1]) usage();
			await setRole(args[0], args[1]);
			break;
		case "unlink":
			if (!args[0] || !args[1]) usage();
			await unlink(args[0], args[1]);
			break;
		case "transfer":
			if (!args[0] || !args[1]) usage();
			await transfer(args[0], args[1]);
			break;
		default:
			usage();
	}
}

main()
	.catch((e) => {
		console.error("Error:", e.message ?? e);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
