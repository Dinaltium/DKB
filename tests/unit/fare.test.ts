import { describe, expect, it } from "vitest";
import { calcFare } from "../../lib/db/fare";

describe("calcFare", () => {
	it("returns 0 if from and to stops are the same", () => {
		expect(calcFare(40, 2, 2, 5)).toBe(0);
	});

	it("returns 0 if route has only 1 stop", () => {
		expect(calcFare(40, 0, 1, 1)).toBe(0);
	});

	it("returns proportional fare based on stop steps", () => {
		// 4 stops: indexes 0, 1, 2, 3. Total intervals = 3.
		// boarding at 0, getting off at 3 (all steps). Should return full fare.
		expect(calcFare(30, 0, 3, 4)).toBe(30);

		// boarding at 0, getting off at 1 (1 step out of 3). Should return 1/3 of full fare.
		expect(calcFare(30, 0, 1, 4)).toBe(10);
	});

	it("enforces a minimum fare of 5 rupees", () => {
		// 1 step out of 100 intervals on a ₹100 full fare should mathematically be ₹1.
		// But it must return the minimum ₹5.
		expect(calcFare(100, 0, 1, 101)).toBe(5);
	});
});
