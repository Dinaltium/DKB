import { createTicketAction } from "@/lib/actions/tickets";
import { db } from "@/lib/db";
import { buses, operators, trips, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	trip_id: z.coerce.number().int().positive(),
	from_stop_id: z.coerce.number().int().positive(),
	to_stop_id: z.coerce.number().int().positive(),
	seat_numbers: z.array(z.string()).optional(),
	seat_count: z.coerce.number().int().positive().max(6).optional(),
	guest_name: z.string().trim().min(1).max(120).optional(),
	guest_phone: z.string().trim().min(7).max(20).optional(),
	use_discount: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
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
		const seatCount = body.seat_numbers?.length ?? body.seat_count ?? 1;

		const res = await createTicketAction({
			tripId: body.trip_id,
			fromStopId: body.from_stop_id,
			toStopId: body.to_stop_id,
			seatCount,
			guestName: body.guest_name,
			guestPhone: body.guest_phone,
			useDiscount: body.use_discount,
		});

		if (!res.success || !res.data) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		const ticket = res.data.ticket;

		const [ownerRow] = await db
			.select({ upiId: users.upiId })
			.from(trips)
			.innerJoin(buses, eq(buses.id, trips.busId))
			.innerJoin(operators, eq(operators.id, buses.operatorId))
			.innerJoin(users, eq(users.id, operators.userId))
			.where(eq(trips.id, body.trip_id))
			.limit(1);

		const ownerUpi = ownerRow?.upiId ?? null;
		const totalFinal = res.data.fareBreakdown.youPayInr;

		const upiLinks = ownerUpi
			? {
					generic: `upi://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
					gpay: `tez://upi/pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
					phonepe: `phonepe://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
					paytm: `paytmmp://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
				}
			: null;

		return NextResponse.json({
			success: true,
			data: {
				ticket,
				fare_breakdown: {
					original_inr: res.data.fareBreakdown.originalInr,
					discount_type: res.data.fareBreakdown.discountType,
					discount_inr: res.data.fareBreakdown.discountInr,
					you_pay_inr: totalFinal,
				},
				distance_km: res.data.distanceKm,
				qr_payload: res.data.qrPayload,
				upi_links: upiLinks,
				owner_upi: ownerUpi,
			},
		});
	} catch (err) {
		console.error("[POST /api/tickets/create]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
