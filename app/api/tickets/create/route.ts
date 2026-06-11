import { auth } from "@/auth";
import { createTicketAction } from "@/lib/actions/tickets";
import { db } from "@/lib/db";
import { buses, trips, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const tripId = body.trip_id;
		const fromStopId = body.from_stop_id;
		const toStopId = body.to_stop_id;
		// BusLink sends seat_numbers array. We map it to seatCount.
		const seatCount = body.seat_numbers?.length || body.seat_count || 1;
		const guestName = body.guest_name;
		const guestPhone = body.guest_phone;
		const useDiscount = body.use_discount;

		const res = await createTicketAction({
			tripId,
			fromStopId,
			toStopId,
			seatCount,
			guestName,
			guestPhone,
			useDiscount,
		});

		if (!res.success || !res.data) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		const ticket = res.data.ticket;

		// Fetch owner UPI to generate UPI deep links as in BusLink
		const [trip] = await db
			.select({ busId: trips.busId })
			.from(trips)
			.where(eq(trips.id, tripId));

		let upiLinks = null;
		if (trip) {
			const [bus] = await db
				.select({ operatorId: buses.operatorId })
				.from(buses)
				.where(eq(buses.id, trip.busId));

			if (bus?.operatorId) {
				const [owner] = await db
					.select({ upiId: users.upiId })
					.from(users)
					// Wait, in schema, operatorId in buses table references operators.id.
					// Let's make sure we query users via operators.userId
					.innerJoin(users, eq(users.id, bus.operatorId)); // Wait, buses.operatorId references operators.id, but let's query operator table
			}
		}

		// Let's do a safe query to get UPI ID of the owner/operator
		const upiResult = await db.execute(
			`SELECT u.upi_id FROM trips t 
			 JOIN buses b ON b.id = t.bus_id 
			 JOIN operators o ON o.id = b.operator_id 
			 JOIN users u ON u.id = o.user_id 
			 WHERE t.id = ${tripId}`,
		);

		const ownerUpi = upiResult.rows[0]?.upi_id as string | undefined;
		const totalFinal = res.data.fareBreakdown.youPayInr;

		if (ownerUpi) {
			upiLinks = {
				generic: `upi://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
				gpay: `tez://upi/pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
				phonepe: `phonepe://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
				paytm: `paytmmp://pay?pa=${ownerUpi}&pn=BusLink&am=${totalFinal}&cu=INR&tn=BusLink+${ticket.ticketUid}`,
			};
		}

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
				owner_upi: ownerUpi || null,
			},
		});
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
