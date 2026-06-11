import { describe, expect, it } from "vitest";
import { distanceBetween, findNearbyTrips } from "../../lib/services/location";

describe("location services", () => {
	describe("distanceBetween", () => {
		it("calculates distance between two coordinates correctly", () => {
			// Coordinates of Mangalore Central Station
			const lat1 = 12.8633;
			const lon1 = 74.8463;

			// Coordinates of Udupi Bus Stand
			const lat2 = 13.3409;
			const lon2 = 74.7423;

			// Distance is roughly 54-55 km
			const dist = distanceBetween(lat1, lon1, lat2, lon2);
			expect(dist).toBeGreaterThan(50);
			expect(dist).toBeLessThan(60);
		});

		it("returns 0 for identical coordinates", () => {
			expect(distanceBetween(12.8633, 74.8463, 12.8633, 74.8463)).toBe(0);
		});
	});

	describe("findNearbyTrips", () => {
		it("filters out trips too far away", () => {
			const mockTrips = [
				{
					id: 1,
					stops: [
						{
							stopName: "Close Stop",
							latitude: "12.8640",
							longitude: "74.8470",
						}, // near Mangalore
					],
				},
				{
					id: 2,
					stops: [
						{ stopName: "Far Stop", latitude: "13.3409", longitude: "74.7423" }, // Udupi
					],
				},
			];

			// User is at Mangalore Central (12.8633, 74.8463)
			const nearby = findNearbyTrips(mockTrips, 12.8633, 74.8463, 5);
			expect(nearby.length).toBe(1);
			expect(nearby[0].id).toBe(1);
			expect(nearby[0].nearestStop.stopName).toBe("Close Stop");
		});
	});
});
