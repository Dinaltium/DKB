import { expect, test } from "@playwright/test";

test.describe("Tickets E2E Flow", () => {
	test("should allow guest ticket booking and payment entry", async ({
		page,
	}) => {
		// Go to trip search
		await page.goto("/trips");

		// Fill in search fields
		const fromInput = page.locator('input[placeholder*="Mangalore"]');
		const toInput = page.locator('input[placeholder*="Udupi"]');
		await fromInput.fill("Mangalore");
		await toInput.fill("Udupi");

		// Submit search
		await page.locator('button[type="submit"]').click();

		// Wait for search results
		// In mock or seeded DB, if results exist, click book. Otherwise, verify message.
		const resultsHeading = page.locator("h2:has-text('RESULTS')");
		await expect(resultsHeading).toBeVisible();

		const firstBookButton = page.locator("a:has-text('BOOK TICKET')").first();
		if (await firstBookButton.isVisible()) {
			await firstBookButton.click();

			// Verify trip detail page is loaded
			await expect(page.locator("h1")).toContainText(/TRIP BOOKING/i);

			// Fill booking details
			await page
				.locator('input[placeholder="Guest Name"]')
				.fill("Guest Traveller");
			await page
				.locator('input[placeholder="Guest Phone Number"]')
				.fill("9988776655");

			// Book
			await page.locator("button:has-text('CONFIRM BOOKING')").click();

			// Verify payment form is shown
			await expect(page.locator("h3:has-text('PAYMENT STEPS')")).toBeVisible();

			// Fill mock UPI reference
			await page
				.locator('input[placeholder*="Reference"]')
				.fill("TXN987654321");

			// Confirm payment
			await page.locator("button:has-text('CONFIRM PAYMENT')").click();

			// Verify success toast or redirect
			await expect(page.locator("body")).toContainText(
				/Payment confirmed|valid/i,
			);
		} else {
			// No active trip found in DB
			await expect(page.locator("body")).toContainText(/No trips found/i);
		}
	});
});
