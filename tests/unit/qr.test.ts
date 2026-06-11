import { describe, expect, it } from "vitest";
import { generateBusQRUrl, generateTicketHash } from "../../lib/services/qr";

describe("qr services", () => {
	describe("generateTicketHash", () => {
		it("generates a valid SHA256 HMAC hash", () => {
			const hash = generateTicketHash("BL-MNG-20260611-ABCD", 42, "user-123");
			expect(hash).toHaveLength(64); // SHA256 hash length in hex
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});

		it("generates different hashes for different tickets", () => {
			const hash1 = generateTicketHash("BL-MNG-20260611-ABCD", 42, "user-123");
			const hash2 = generateTicketHash("BL-MNG-20260611-WXYZ", 42, "user-123");
			expect(hash1).not.toBe(hash2);
		});
	});

	describe("generateBusQRUrl", () => {
		it("generates a correct bus URL with registration slug", () => {
			const url = generateBusQRUrl("KA 19 AB 1234");
			expect(url).toContain("/bus/KA-19-AB-1234");
		});
	});
});
