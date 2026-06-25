"use client";

// Mock UPI approve screen. Stands in for the real UPI app launch when
// NEXT_PUBLIC_PAYMENT_MODE=mock. Renders a fake bank-style approval card,
// generates a mock UTR, posts it back to the capture-utr endpoint, and
// bounces the user to /quick-board with success state.
//
// Real-mode never reaches this page — quick-board/page.tsx hands off to
// the OS via `window.location.href = upi://pay?...` instead.

import { generateMockUtr } from "@/lib/upi";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Phase = "review" | "processing" | "done" | "failed";

export default function MockPayPage() {
	const { uid } = useParams<{ uid: string }>();
	const router = useRouter();
	const [phase, setPhase] = useState<Phase>("review");
	const [utr, setUtr] = useState("");

	async function approve() {
		setPhase("processing");
		// Simulate UPI rail latency.
		await new Promise((r) => setTimeout(r, 1200));
		const mockUtr = generateMockUtr();
		setUtr(mockUtr);
		const res = await fetch(`/api/quick-board/${uid}/capture-utr`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ utr: mockUtr, upiApp: "mock" }),
		}).then((r) => r.json());
		setPhase(res.success ? "done" : "failed");
		if (res.success) {
			setTimeout(() => router.push("/quick-board"), 1500);
		}
	}

	function decline() {
		router.back();
	}

	return (
		<div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
			<div className="theme-panel rounded-none border-2 p-6 neo-shadow">
				<div className="mb-4 flex items-center justify-between">
					<span
						className="text-2xl font-black uppercase tracking-wide"
						style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
					>
						MockBank UPI
					</span>
					<span className="rounded-none border-2 border-foreground bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-yellow-950">
						Test Mode
					</span>
				</div>

				{phase === "review" && (
					<>
						<p
							className="mb-1 text-[11px] font-black uppercase tracking-widest"
							style={{ color: "var(--text-muted)" }}
						>
							Pay to merchant
						</p>
						<p className="text-base font-bold">BusLink Operator</p>
						<p
							className="mt-3 text-[11px] font-black uppercase tracking-widest"
							style={{ color: "var(--text-muted)" }}
						>
							Note
						</p>
						<p className="font-mono text-sm">BusLink {uid}</p>

						<div className="mt-6 flex gap-3">
							<button
								onClick={decline}
								className="theme-btn-secondary brutal-transition brutal-hover inline-flex h-11 flex-1 items-center justify-center rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow"
							>
								Decline
							</button>
							<button
								onClick={approve}
								className="theme-btn-primary brutal-transition brutal-hover inline-flex h-11 flex-1 items-center justify-center rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow"
							>
								Approve
							</button>
						</div>
					</>
				)}

				{phase === "processing" && (
					<div className="flex items-center gap-3 py-6">
						<Loader2 className="h-5 w-5 animate-spin" />
						<span className="font-bold">Sending to bank…</span>
					</div>
				)}

				{phase === "done" && (
					<div className="py-4">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-6 w-6 text-green-600" />
							<span className="text-lg font-black uppercase tracking-wide">
								Success
							</span>
						</div>
						<p className="mt-1 font-mono text-xs">UTR {utr}</p>
						<p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
							Returning to BusLink…
						</p>
					</div>
				)}

				{phase === "failed" && (
					<div className="py-4">
						<div className="flex items-center gap-2">
							<XCircle className="h-6 w-6 text-red-600" />
							<span className="text-lg font-black uppercase tracking-wide">
								Failed
							</span>
						</div>
						<button
							onClick={() => router.push("/quick-board")}
							className="theme-btn-secondary brutal-transition brutal-hover mt-3 inline-flex h-10 items-center rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow"
						>
							Back
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
