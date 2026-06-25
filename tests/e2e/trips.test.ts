import { expect, test } from "@playwright/test";

test.describe("Trip Search & Listings E2E", () => {
	test("should load trip search page and allow filling details", async ({
		page,
	}) => {
		await page.goto("/trips");

		// AppShell renders the page title as the <h1>.
		await expect(page.locator("h1")).toContainText(/Find a Trip/i);

		// Fill search queries (placeholders are "e.g. Mangalore" / "e.g. Udupi").
		const fromInput = page.locator('input[placeholder*="Mangalore"]');
		const toInput = page.locator('input[placeholder*="Udupi"]');

		await fromInput.fill("Mangalore");
		await toInput.fill("Udupi");

		await expect(fromInput).toHaveValue("Mangalore");
		await expect(toInput).toHaveValue("Udupi");

		// Locate and click search button
		const searchButton = page.locator('button[type="submit"]');
		await expect(searchButton).toBeVisible();
	});
});
