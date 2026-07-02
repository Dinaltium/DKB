import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../../components/shared/StatusBadge";

describe("StatusBadge Component", () => {
	it("renders badge with Running status", () => {
		render(<StatusBadge status="Running" />);
		const badge = screen.getByText("Running");
		expect(badge).toBeDefined();
	});

	it("renders badge with Delayed status", () => {
		render(<StatusBadge status="Delayed" />);
		const badge = screen.getByText("Delayed");
		expect(badge).toBeDefined();
	});

	it("renders badge with pending status", () => {
		render(<StatusBadge status="pending" />);
		const badge = screen.getByText("pending");
		expect(badge).toBeDefined();
	});
});
