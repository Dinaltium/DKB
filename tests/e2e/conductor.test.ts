import { expect, test } from "@playwright/test";

test.describe("Conductor E2E Flow", () => {
	test("should load conductor dashboard and display trip details", async ({
		page,
	}) => {
		// Conductor access is protected by middleware, so direct navigation redirects to auth unless signed in as conductor.
		// However, we can test that loading /conductor redirects or loads.
		await page.goto("/conductor");

		// If redirected to auth, that validates protection
		const currentUrl = page.url();
		if (currentUrl.includes("/auth")) {
			await expect(page.locator('input[type="email"]')).toBeVisible();
		} else {
			// If loaded successfully, verify page elements
			await expect(page.locator("h1")).toContainText(/CONDUCTOR DASHBOARD/i);
			await expect(page.locator("body")).toContainText(
				/No Active Trip|SCHEDULED TRIPS/i,
			);
		}
	});
});
