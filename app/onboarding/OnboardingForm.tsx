"use client";

import { completeOnboardingAction } from "@/lib/actions/onboarding";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
	initialName: string;
	initialEmail: string;
}

export function OnboardingForm({ initialName, initialEmail }: Props) {
	const router = useRouter();
	const [name, setName] = useState(initialName);
	const [phone, setPhone] = useState("");
	const [error, setError] = useState("");
	const [isPending, startTransition] = useTransition();

	const inputStyle: React.CSSProperties = {
		background: "var(--input-bg)",
		borderColor: "var(--input-border)",
		color: "var(--input-text)",
	};

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (name.trim().length < 2) {
			setError("Please enter your full name.");
			return;
		}
		const cleaned = phone.replace(/[\s-]/g, "");
		if (!/^\+?\d{7,15}$/.test(cleaned)) {
			setError("Enter a valid phone number (7–15 digits).");
			return;
		}

		startTransition(async () => {
			const res = await completeOnboardingAction({ name, phone: cleaned });
			if (!res.success) {
				setError(res.error);
				return;
			}
			// Force a fresh JWT so middleware/proxy sees onboarded=true.
			router.push("/");
			router.refresh();
		});
	};

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="onboarding-email"
					className="mb-1 block text-[10px] font-bold uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					Email
				</label>
				<input
					id="onboarding-email"
					type="email"
					value={initialEmail}
					readOnly
					disabled
					className="h-12 w-full rounded-none border-2 border-foreground px-3 text-sm opacity-70"
					style={inputStyle}
				/>
			</div>

			<div>
				<label
					htmlFor="onboarding-name"
					className="mb-1 block text-[10px] font-bold uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					Full name
				</label>
				<input
					id="onboarding-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Your name as on a ticket"
					autoComplete="name"
					required
					className="theme-input brutal-transition brutal-focus h-12 w-full rounded-none border-2 border-foreground px-3 text-base outline-none neo-shadow"
					style={inputStyle}
				/>
			</div>

			<div>
				<label
					htmlFor="onboarding-phone"
					className="mb-1 block text-[10px] font-bold uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					Phone
				</label>
				<input
					id="onboarding-phone"
					type="tel"
					inputMode="tel"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					placeholder="+91 98765 43210"
					autoComplete="tel"
					required
					className="theme-input brutal-transition brutal-focus h-12 w-full rounded-none border-2 border-foreground px-3 text-base outline-none neo-shadow"
					style={inputStyle}
				/>
				<p
					className="mt-1 text-[11px]"
					style={{ color: "var(--text-muted)" }}
				>
					We send ticket QR + trip alerts here. Never shared.
				</p>
			</div>

			{error && (
				<div
					className="rounded-none border-2 border-foreground px-3 py-2 text-sm"
					style={{
						background: "var(--status-stopped-bg)",
						color: "var(--status-stopped-text)",
					}}
				>
					{error}
				</div>
			)}

			<button
				type="submit"
				disabled={isPending}
				className="theme-btn-primary brutal-transition brutal-hover flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 text-sm font-bold uppercase tracking-widest neo-shadow disabled:opacity-60"
			>
				{isPending ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" />
						Saving…
					</>
				) : (
					"Continue"
				)}
			</button>
		</form>
	);
}
