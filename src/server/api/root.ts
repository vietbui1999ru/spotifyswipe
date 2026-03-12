import { adminRouter } from "~/server/api/routers/admin";
import { demoRouter } from "~/server/api/routers/demo";
import { lastfmRouter } from "~/server/api/routers/lastfm";
import { playlistRouter } from "~/server/api/routers/playlist";
import { socialRouter } from "~/server/api/routers/social";
import { spotifyRouter } from "~/server/api/routers/spotify";
import { swipeRouter } from "~/server/api/routers/swipe";
import { tokenRouter } from "~/server/api/routers/token";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	admin: adminRouter,
	demo: demoRouter,
	lastfm: lastfmRouter,
	playlist: playlistRouter,
	swipe: swipeRouter,
	social: socialRouter,
	spotify: spotifyRouter,
	token: tokenRouter,
	user: userRouter,
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
