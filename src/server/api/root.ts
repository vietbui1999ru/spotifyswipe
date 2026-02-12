import { playlistRouter } from "~/server/api/routers/playlist";
import { socialRouter } from "~/server/api/routers/social";
import { songRouter } from "~/server/api/routers/song";
import { swipeRouter } from "~/server/api/routers/swipe";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	song: songRouter,
	playlist: playlistRouter,
	swipe: swipeRouter,
	social: socialRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.song.search({ query: "Beatles" });
 */
export const createCaller = createCallerFactory(appRouter);
