import { PrismaAdapter } from "@auth/prisma-adapter";

import { db } from "~/server/db";
import { createLogger } from "~/server/logger";
import { lastfmProvider } from "./lastfm-provider";

const log = createLogger("auth");

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	trustHost: true,
	providers: [lastfmProvider],
	adapter: PrismaAdapter(db),
	callbacks: {
		signIn: async ({ user, account }) => {
			log.info("Sign-in callback", {
				user: user?.email,
				provider: account?.provider,
			});
			return true;
		},
		redirect: async ({ url, baseUrl }) => {
			log.debug("Redirect callback", { url, baseUrl });
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
	},
	events: {
		async signIn({ user, account }) {
			log.info("Sign-in event", {
				email: user?.email,
				provider: account?.provider,
			});
		},
	},
	debug: process.env.NODE_ENV !== "production",
};
