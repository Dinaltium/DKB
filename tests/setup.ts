// tests/setup.ts
// Test utilities and database mocking helpers for unit/component tests

import { vi } from "vitest";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
	}),
	usePathname: () => "/dashboard",
	useSearchParams: () => new URLSearchParams(),
	redirect: (url: string) => {
		throw new Error(`Redirected to: ${url}`);
	},
}));

// Mock Auth.js
vi.mock("next-auth", () => ({
	default: () => ({
		auth: () =>
			Promise.resolve({ user: { id: "test-user-id", role: "passenger" } }),
		handlers: { GET: vi.fn(), POST: vi.fn() },
		signIn: vi.fn(),
		signOut: vi.fn(),
	}),
}));

export function createMockUser(overrides = {}) {
	return {
		id: "user-123",
		name: "John Doe",
		email: "john@example.com",
		role: "passenger",
		phone: "9876543210",
		upiId: "john@upi",
		isActive: true,
		walletBalance: 100,
		createdAt: new Date(),
		...overrides,
	};
}

export function createMockTrip(overrides = {}) {
	return {
		id: 101,
		busId: "KA-19-F-1234",
		routeId: 1,
		departureDate: "2026-06-11",
		departureTime24: "08:30",
		status: "scheduled",
		currentStopIdx: 0,
		isLive: false,
		createdAt: new Date(),
		...overrides,
	};
}

export function createMockTicket(overrides = {}) {
	return {
		id: "t-999",
		tripId: 101,
		userId: "user-123",
		passengerName: "John Doe",
		boardingStopId: "stop-mangalore",
		droppingStopId: "stop-udupi",
		farePaid: 45,
		status: "booked",
		qrCodeUid: "QR-TEST-UID-123",
		createdAt: new Date(),
		...overrides,
	};
}
