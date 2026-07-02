"use client";

import { submitComplaintAction } from "@/lib/actions/bus";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const CATEGORIES = [
	"Overcharging",
	"Wrong Route",
	"Harassment",
	"Reckless Driving",
	"Other",
];

interface ComplaintDialogProps {
	busId: string;
	busNumber: string;
	onSuccess?: () => void;
}

export function ComplaintDialog({
	busId,
	busNumber,
	onSuccess,
}: ComplaintDialogProps) {
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState("Overcharging");
	const [description, setDescription] = useState("");
	const [isPending, startTransition] = useTransition();

	const handleSubmit = () => {
		if (!description.trim()) {
			toast.error("Please add complaint details");
			return;
		}

		startTransition(async () => {
			const result = await submitComplaintAction({
				busId,
				busNumber,
				category,
				description,
			});

			if (result.success) {
				toast.success("Complaint submitted successfully");
				setDescription("");
				setOpen(false);
				onSuccess?.();
			} else {
				toast.error("Unable to submit complaint. Please try again.");
			}
		});
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
				data-testid="open-complaint-dialog-button"
				className="theme-btn-secondary brutal-transition brutal-hover h-12 rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-80"
				style={{
					background: "var(--bg-surface)",
					borderColor: "var(--border-strong)",
					color: "var(--text-primary)",
				}}
			>
				Complaint / Feedback
			</button>
		);
	}

	return (
		<>
			<div className="fixed inset-0 z-40 bg-foreground/50" />
			<div
				className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none border-2 border-foreground p-6 neo-shadow"
				style={{ background: "var(--bg-surface)" }}
			>
				<div className="mb-1 flex items-start justify-between">
					<div>
						<h2
							className="text-3xl font-extrabold uppercase"
							style={{
								fontFamily: "'Barlow Condensed', sans-serif",
								color: "var(--text-primary)",
							}}
							data-testid="complaint-dialog-title"
						>
							Raise Complaint
						</h2>
						<p
							className="text-sm"
							style={{ color: "var(--text-muted)" }}
							data-testid="complaint-dialog-description"
						>
							Bus {busNumber}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="theme-btn-secondary brutal-transition brutal-hover ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 font-black text-sm neo-shadow"
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

				<div className="mt-4 space-y-3">
					<select
						data-testid="complaint-category-select"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="theme-input brutal-transition brutal-focus h-11 w-full rounded-none border-2 border-foreground px-3 text-sm font-medium outline-none neo-shadow"
						style={inputStyle}
					>
						{CATEGORIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>

					<textarea
						data-testid="complaint-description-input"
						placeholder="Describe the issue..."
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={4}
						className="theme-input brutal-transition brutal-focus w-full rounded-none border-2 border-foreground p-3 text-sm outline-none neo-shadow"
						style={inputStyle}
					/>
				</div>

				<div className="mt-4 flex justify-end gap-2">
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="theme-btn-secondary brutal-transition brutal-hover h-11 rounded-none border-2 px-4 text-sm font-bold uppercase tracking-wide neo-shadow"
					>
						Cancel
					</button>
					<button
						type="button"
						data-testid="complaint-submit-button"
						onClick={handleSubmit}
						disabled={isPending}
						className="theme-btn-dark brutal-transition brutal-hover h-11 rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-90 disabled:opacity-60"
					>
						{isPending ? "Submitting..." : "Submit Complaint"}
					</button>
				</div>
			</div>
		</>
	);
}
