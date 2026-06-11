import { expect, test } from "@playwright/test";

test.describe("Rewards E2E Flow", () => {
	test("should load rewards tab, leaderboard, and titles", async ({ page }) => {
		// Go to registration page
		await page.goto("/auth?callbackUrl=/dashboard");

		// Click on Register tab
		await page.locator("button:has-text('Register')").click();

		// Fill in details for a new random user
		const randomEmail = `testrewards_${Date.now()}@example.com`;
		await page
			.locator('input[placeholder="Full name"]')
			.fill("Rewards Tester User");
		await page.locator('input[placeholder="Email address"]').fill(randomEmail);
		await page.locator('input[placeholder="Password"]').fill("SuperSecure123!");
		await page
			.locator('input[placeholder="Confirm password"]')
			.fill("SuperSecure123!");

		// Submit registration
		await page.locator("button:has-text('Create Account')").click();

		// Wait for redirection to dashboard
		await expect(page).toHaveURL(/.*dashboard/);

		// Select "XP & Rewards" sub-tab
		await page.locator("button:has-text('XP & Rewards')").click();

		// Check that the XP summary or leaderboard section is visible
		await expect(
			page.locator("h3:has-text('XP Profile')").first(),
		).toBeVisible();

		// Verify titles section or stickers section exist
		await expect(page.locator("body")).toContainText(
			/unlocked titles|stickers/i,
		);
	});
});
