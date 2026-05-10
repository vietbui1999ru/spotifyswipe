import { vi } from "vitest";
import { createCaller } from "~/server/api/root";

export function createMockDb() {
	return {
		song: { upsert: vi.fn() },
		swipeAction: { upsert: vi.fn(), findMany: vi.fn() },
		account: { findFirst: vi.fn(), findMany: vi.fn() },
		playlist: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
		playlistSong: { findFirst: vi.fn(), upsert: vi.fn() },
		user: { findUnique: vi.fn() },
	};
}

export function createTestCaller(
	db: ReturnType<typeof createMockDb>,
	userId = "user-1",
) {
	return createCaller({
		db: db as any,
		session: {
			user: {
				id: userId,
				email: "test@example.com",
				name: "Test User",
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			session: {
				id: "session-1",
				token: "mock-token",
				userId,
				expiresAt: new Date(Date.now() + 86400000),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		} as any,
		requestId: "00000000-0000-0000-0000-000000000000",
		headers: new Headers(),
	});
}
