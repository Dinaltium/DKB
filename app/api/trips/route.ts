import { auth } from "@/auth";
import { createTripAction } from "@/lib/actions/trips";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const body = await request.json();
		const res = await createTripAction({
			busId: body.bus_id,
			routeId: Number(body.route_id),
			departureDate: body.departure_date,
			departureTime: body.departure_time,
			departurePeriod: body.departure_period,
			stops: body.stops?.map((s: any) => ({
				stopName: s.stop_name,
				stopOrder: Number(s.stop_order),
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
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
