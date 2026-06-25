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

		// Results section heading always renders after a search.
		await expect(page.getByRole("heading", { name: /Results/i })).toBeVisible();

		// Each result card is a link with a "Book" call-to-action. When the DB has
		// matching trips we exercise the full booking + payment flow; otherwise we
		// assert the empty-state copy.
		const firstBookLink = page.locator("a:has-text('Book')").first();
		if (await firstBookLink.isVisible()) {
			await firstBookLink.click();

			// Trip detail page (AppShell title "Book Ticket").
			await expect(page.locator("h1")).toContainText(/Book Ticket/i);

			// Fill guest booking details.
			await page.getByPlaceholder("Full Name").fill("Guest Traveller");
			await page.getByPlaceholder("Phone Number").fill("9988776655");

			// Submit booking → moves to the payment step.
			await page.locator("button:has-text('CONFIRM BOOKING')").click();

			// Payment details section appears.
			await expect(
				page.getByRole("heading", { name: /Payment Details/i }),
			).toBeVisible();

			// Enter a mock UPI transaction reference.
			await page.getByPlaceholder("e.g. 123456789012").fill("TXN987654321");

			// Confirm payment.
			await page.locator("button:has-text('CONFIRM PAYMENT')").click();

			// Verify success feedback.
			await expect(page.locator("body")).toContainText(
				/Payment confirmed|active|valid/i,
			);
		} else {
			// No matching trips seeded — assert the empty-state copy.
			await expect(page.locator("body")).toContainText(
				/No trips match those stops yet/i,
			);
		}
	});
});
