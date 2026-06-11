import { expect, test } from "@playwright/test";

test.describe("Passes E2E Flow", () => {
	test("should allow passenger to register and apply for student pass", async ({
		page,
	}) => {
		// Go to registration page
		await page.goto("/auth?callbackUrl=/dashboard");

		// Click on Register tab
		await page.locator("button:has-text('Register')").click();

		// Fill in details for a new random user
		const randomEmail = `testpassuser_${Date.now()}@example.com`;
		await page
			.locator('input[placeholder="Full name"]')
			.fill("Pass Tester User");
		await page.locator('input[placeholder="Email address"]').fill(randomEmail);
		await page.locator('input[placeholder="Password"]').fill("SuperSecure123!");
		await page
			.locator('input[placeholder="Confirm password"]')
			.fill("SuperSecure123!");

		// Submit registration
		await page.locator("button:has-text('Create Account')").click();

		// Wait for redirection to dashboard
		await expect(page).toHaveURL(/.*dashboard/);

		// Select "Bus Passes" sub-tab
		await page.locator("button:has-text('Bus Passes')").click();

		// Verify applying for bus pass is visible
		await expect(
			page.locator("h3:has-text('Apply for Bus Pass')"),
		).toBeVisible();

		// Fill student pass details
		await page
			.locator('input[placeholder="Enter your name"]')
			.fill("Pass Tester User");
		await page
			.locator('input[placeholder="College Name"]')
			.fill("Mangalore Institute of Tech");
		await page.locator('input[placeholder="ID Number"]').fill("MIT12345");
		await page.locator('input[placeholder="YYYY"]').fill("2028");
		await page.locator('input[placeholder*="Txn Ref"]').fill("TXN-PASS-50R");

		// Submit application
		await page.locator("button:has-text('SUBMIT APPLICATION')").click();

		// Confirm success feedback appears
		await expect(page.locator("body")).toContainText(/submitted successfully/i);
	});
});
