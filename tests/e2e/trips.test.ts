import { expect, test } from "@playwright/test";

test.describe("Trip Search & Listings E2E", () => {
	test("should load trip search page and allow filling details", async ({
		page,
	}) => {
		await page.goto("/trips");

		// Verify title
		await expect(page.locator("h1")).toContainText(/BUS TRIP SEARCH/i);

		// Fill search queries
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
