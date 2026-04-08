// ── PaymentDrawer.tsx ──────────────────────────────────────────────────────────
"use client";

import { CircleCheckBig, CircleX, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { recordPaymentAction } from "@/lib/actions/bus";

interface PaymentDrawerProps {
	busId: string;
	busNumber: string;
	amount: number;
	onSuccess?: () => void;
}

interface Receipt {
	status: "success" | "failed";
	transactionId: string;
}

export function PaymentDrawer({
	busId,
	busNumber,
	amount,
	onSuccess,
}: PaymentDrawerProps) {
	const [open, setOpen] = useState(false);
	const [upiId, setUpiId] = useState("");
	const [payerName, setPayerName] = useState("");
	const [loading, setLoading] = useState(false);
	const [receipt, setReceipt] = useState<Receipt | null>(null);

	const processPayment = async () => {
		if (!upiId.trim()) {
			toast.error("Please enter your UPI ID");
			return;
		}
		setLoading(true);
		setReceipt(null);

		// Simulate a 1.5 s payment gateway delay
		await new Promise((resolve) => setTimeout(resolve, 1500));

		const success = Math.random() >= 0.2;
		const transactionId = `TXN${Date.now()}`;
		const result: Receipt = {
			status: success ? "success" : "failed",
			transactionId,
		};

		setReceipt(result);

		// Persist the payment to the DB regardless of success/failure
		try {
			await recordPaymentAction({
				busId,
				busNumber,
				amount,
				upiId: upiId.trim(),
				transactionId,
				status: result.status,
			});
		} catch (err) {
			// Non-fatal — the mock payment result is already shown to the user
			console.error("[PaymentDrawer] recordPaymentAction failed:", err);
		}

		if (success) {
			toast.success("Payment completed successfully");
			onSuccess?.();
		} else {
			toast.error("Payment failed. Please retry.");
		}

		setLoading(false);
	};

	const reset = () => {
		setReceipt(null);
		setUpiId("");
		setPayerName("");
	};

	const inputStyle = {
		background: "var(--input-bg)",
		borderColor: "var(--input-border)",
		color: "var(--input-text)",
	};

	if (!open) {
		return (
			<button
				onClick={() => setOpen(true)}
				data-testid="open-payment-drawer-button"
				className="h-12 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:bg-amber-400 active:scale-[0.98]"
			>
				Pay via UPI
			</button>
		);
	}

	return (
		<>
			<div className="fixed inset-0 z-40 bg-black/40" />
			<div
				className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl rounded-none border-2 border-foreground px-4 pb-8 pt-6 shadow-[4px_4px_0_hsl(var(--foreground))]"
				style={{
					background: "var(--bg-surface)",
				}}
			>
				<div className="mb-1 flex items-center justify-between">
					<h2
						className="text-3xl font-extrabold uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
						data-testid="payment-drawer-title"
					>
						Mock RazorPay Checkout
					</h2>
					<button
						onClick={() => {
							setOpen(false);
							reset();
						}}
						type="button"
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 border-foreground font-black text-sm text-foreground shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
						style={{ background: "var(--bg-surface)" }}
						aria-label="Close"
					>
						✕
					</button>
				</div>
				<p
					className="mt-1 text-center text-[10px]"
					style={{ color: "var(--text-muted)" }}
				>
					Changes will be lost if you close
				</p>
				<p
					className="mb-4 text-sm"
					style={{ color: "var(--text-muted)" }}
					data-testid="payment-drawer-description"
				>
					Bus {busNumber} &bull; Pay ₹{amount}
				</p>

				<div className="space-y-3">
					<input
						data-testid="payment-payer-name-input"
						type="text"
						placeholder="Your name"
						value={payerName}
						onChange={(e) => setPayerName(e.target.value)}
						className="h-11 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
						style={inputStyle}
					/>
					<input
						data-testid="payment-upi-id-input"
						type="text"
						placeholder="UPI ID (example@upi)"
						value={upiId}
						onChange={(e) => setUpiId(e.target.value)}
						className="h-11 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
						style={inputStyle}
					/>

					{receipt && (
						<div
							data-testid="payment-result-card"
							className="ticket-stub rounded-none border-2 p-4 text-sm shadow-[4px_4px_0_hsl(var(--foreground))]"
							style={{
								borderColor:
									receipt.status === "success" ? "#10b981" : "#ef4444",
							}}
						>
							<div
								className="flex items-center gap-2 font-semibold"
								style={{ color: "var(--text-primary)" }}
							>
								{receipt.status === "success" ? (
									<CircleCheckBig className="h-5 w-5 text-emerald-500" />
								) : (
									<CircleX className="h-5 w-5 text-red-500" />
								)}
								<span data-testid="payment-result-status">
									{receipt.status === "success"
										? "Payment Successful"
										: "Payment Failed"}
								</span>
							</div>
							<p
								data-testid="payment-result-transaction-id"
								className="mt-2 font-mono text-xs"
								style={{ color: "var(--text-muted)" }}
							>
								Transaction: {receipt.transactionId}
							</p>
						</div>
					)}

					<button
						onClick={processPayment}
						disabled={loading}
						data-testid="payment-submit-button"
						className="mt-1 h-11 w-full rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-90 disabled:opacity-60"
					>
						{loading ? (
							<span className="flex items-center justify-center gap-2">
								<LoaderCircle className="h-4 w-4 animate-spin" />
								Processing...
							</span>
						) : (
							`Pay ₹${amount}`
						)}
					</button>
				</div>
			</div>
		</>
	);
}
