import { expect, test } from "@playwright/test";

test.describe("Admin E2E Flow", () => {
	test("should redirect unauthenticated users trying to access admin dashboard", async ({
		page,
	}) => {
		// Admin access is protected. Navigate directly to /admin (which redirects to /dashboard)
		await page.goto("/admin");

		// Unauthenticated user should end up on /auth
		await expect(page).toHaveURL(/.*auth/);
	});
});
