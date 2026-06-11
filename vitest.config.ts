import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		exclude: ["**/node_modules/**", "**/dist/**", "**/tests/e2e/**"],
	},
	resolve: {
		alias: {
			"@/components": path.resolve(__dirname, "./src/components"),
			"@": path.resolve(__dirname, "./"),
		},
	},
});
