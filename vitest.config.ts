import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
		// Provide safe defaults so unit tests don't depend on a real .env.local.
		// Real values are still picked up from process.env (CI secrets, local
		// dotenv-cli wrapper) — these only fill in when nothing was set.
		env: {
			AUTH_SECRET: process.env.AUTH_SECRET || "test-secret-do-not-use-in-prod",
			DATABASE_URL:
				process.env.DATABASE_URL || "postgres://stub@localhost/stub",
			NEXT_PUBLIC_APP_URL:
				process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
		},
	},
	resolve: {
		alias: {
			"@/components": path.resolve(__dirname, "./src/components"),
			"@": path.resolve(__dirname, "./"),
		},
	},
});
