import { expect, test } from "@playwright/test";

test.describe("Passes E2E Flow", () => {
	test("should allow passenger to register and apply for student pass", async ({
		page,
	}) => {
		// Go to registration page
		await page.goto("/auth?callbackUrl=/dashboard");

		// Switch to the Register tab
		await page.locator("button:has-text('Register')").click();

		// Fill in details for a new random user
		const randomEmail = `testpassuser_${Date.now()}@example.com`;
		await page.getByPlaceholder("Full name").fill("Pass Tester User");
		await page.getByPlaceholder("Email address").fill(randomEmail);
		await page
			.getByPlaceholder("Password", { exact: true })
			.fill("SuperSecure123!");
		await page.getByPlaceholder("Confirm password").fill("SuperSecure123!");

		// Submit registration
		await page.locator("button:has-text('Create Account')").click();

		// Newly-registered passengers are routed through a one-step onboarding
		// (name + phone) before they can reach the dashboard.
		await expect(
			page.getByRole("heading", { name: /Welcome aboard/i }),
		).toBeVisible({ timeout: 15000 });
		await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
		await page.locator("button:has-text('Continue')").click();

		// Onboarding redirects to "/"; go to the passenger dashboard and confirm
		// we land on it (AppShell title "My Dashboard") rather than relying on a
		// loose URL match.
		await page.waitForURL((url) => !url.pathname.startsWith("/onboarding"), {
			timeout: 15000,
		});
		await page.goto("/dashboard");
		await expect(
			page.getByRole("heading", { name: /My Dashboard/i }),
		).toBeVisible({ timeout: 15000 });

		// Select "Bus Passes" sub-tab
		await page.locator("button:has-text('Bus Passes')").click();

		// Verify applying for bus pass is visible
		await expect(
			page.getByRole("heading", { name: /Apply for Bus Pass/i }),
		).toBeVisible();

		// Fill student pass details
		await page.getByPlaceholder("Enter your name").fill("Pass Tester User");
		await page
			.getByPlaceholder("College Name")
			.fill("Mangalore Institute of Tech");
		await page.getByPlaceholder("ID Number").fill("MIT12345");
		await page.getByPlaceholder("YYYY").fill("2028");
		await page.getByPlaceholder(/Txn Ref/i).fill("TXN-PASS-50R");

		// Submit application
		await page.locator("button:has-text('SUBMIT APPLICATION')").click();

		// Confirm success feedback appears
		await expect(page.locator("body")).toContainText(/submitted successfully/i);
	});
});
