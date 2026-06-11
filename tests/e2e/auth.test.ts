import { expect, test } from "@playwright/test";

test.describe("Authentication Flows", () => {
	test("should load the login/auth page successfully", async ({ page }) => {
		await page.goto("/auth");

		// Verify page title or presence of login elements
		await expect(page).toHaveTitle(/BusLink|dkbus|Sign In|Auth/i);

		// Check for credentials form elements
		const emailInput = page.locator('input[type="email"]');
		const passwordInput = page.locator('input[type="password"]');

		await expect(emailInput).toBeVisible();
		await expect(passwordInput).toBeVisible();
	});

	test("should redirect unauthenticated users trying to access dashboard", async ({
		page,
	}) => {
		await page.goto("/dashboard");

		// Should be redirected to the auth page
		await expect(page).toHaveURL(/.*auth/);
	});
});
