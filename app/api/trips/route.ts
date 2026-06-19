import { auth } from "@/auth";
import { createTripAction } from "@/lib/actions/trips";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const stopSchema = z.object({
	stop_name: z.string().trim().min(1).max(120),
	stop_order: z.coerce.number().int().nonnegative(),
	arrival_time: z.string().trim().min(1).max(16),
	arrival_period: z.enum(["AM", "PM"]),
	latitude: z.coerce.number().min(-90).max(90).optional(),
	longitude: z.coerce.number().min(-180).max(180).optional(),
});

const bodySchema = z.object({
	bus_id: z.string().trim().min(1).max(64),
	route_id: z.coerce.number().int().positive(),
	departure_date: z.string().trim().min(1).max(32),
	departure_time: z.string().trim().min(1).max(16),
	departure_period: z.enum(["AM", "PM"]),
	stops: z.array(stopSchema).max(100).optional(),
});

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const json = await request.json().catch(() => null);
		const parsed = bodySchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: "Invalid request body" },
				{ status: 400 },
			);
		}
		const body = parsed.data;

		const res = await createTripAction({
			busId: body.bus_id,
			routeId: body.route_id,
			departureDate: body.departure_date,
			departureTime: body.departure_time,
			departurePeriod: body.departure_period,
			stops: body.stops?.map((s) => ({
				stopName: s.stop_name,
				stopOrder: s.stop_order,
				arrivalTime: s.arrival_time,
				arrivalPeriod: s.arrival_period,
				latitude: s.latitude,
				longitude: s.longitude,
			})),
		});

		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{ success: true, data: res.data },
			{ status: 201 },
		);
	} catch (err) {
		console.error("[POST /api/trips]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
