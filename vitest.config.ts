import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		env: {
			SKIP_ENV_VALIDATION: "1",
			NEXT_PUBLIC_LASTFM_API_KEY: "test-key",
		},
	},
	resolve: {
		alias: {
			"~/": `${path.resolve(__dirname, "./src")}/`,
		},
	},
});
