"use client";

// ⚠ TEST MODE: expiry = 5 MINUTES from account creation.
// TO SWITCH TO PRODUCTION: change createOperatorAction in
// lib/actions/bus.ts from (5 * 60 * 1000) to (7 * 24 * 60 * 60 * 1000)

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/lib/actions/auth";

function formatRemaining(ms: number): string {
	if (ms <= 0) return "EXPIRED";
	const totalSec = Math.floor(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	if (h > 0) return `${h}h ${m}m ${s}s remaining`;
	if (m > 0) return `${m}m ${s}s remaining`;
	return `${s}s remaining`;
}

export default function ChangePasswordPage() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [fieldError, setFieldError] = useState("");
	const [expiresAt, setExpiresAt] = useState<Date | null>(null);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch("/api/me", { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as {
					passwordExpiresAt: string | null;
				};
				if (data.passwordExpiresAt)
					setExpiresAt(new Date(data.passwordExpiresAt));
			} catch {
				// no-op
			}
		};
		load();
	}, []);

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	const timeLabel = useMemo(() => {
		if (!expiresAt) return "…";
		return formatRemaining(expiresAt.getTime() - now);
	}, [expiresAt, now]);

	const expired = timeLabel === "EXPIRED";

	const handleSubmit = () => {
		setFieldError("");
		if (newPassword.length < 8) {
			setFieldError("Password must be at least 8 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setFieldError("Passwords do not match.");
			return;
		}
		startTransition(async () => {
			const result = await changePasswordAction(newPassword);
			if (!result.success) {
				setFieldError(result.error ?? "Unable to update password");
				return;
			}
			toast.success("Password updated!");
			router.push("/dashboard");
			router.refresh();
		});
	};

	return (
		<div
			className="buslink-page flex min-h-screen flex-col px-4 py-10"
			style={{ background: "var(--bg-page)" }}
		>
			<div className="mx-auto w-full max-w-lg flex-1">
				<Link href="/" className="inline-block">
					<p
						className="text-4xl font-extrabold uppercase tracking-wide"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						BusLink
					</p>
				</Link>

				<div
					className="mt-8 border-2 px-4 py-4 text-center"
					style={{
						background: "var(--color-amber)",
						borderColor: "var(--text-primary)",
						color: "var(--text-primary)",
						boxShadow: "4px 4px 0 var(--text-primary)",
					}}
				>
					<p className="text-lg font-black uppercase tracking-wide">
						⚠ PASSWORD CHANGE REQUIRED
					</p>
				</div>
				<p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
					Your account was created with a temporary password. Set a new password
					to continue using BusLink.
				</p>

				<p
					className="mt-4 font-mono text-sm font-bold"
					style={{
						color: expired
							? "var(--status-stopped-text)"
							: "var(--text-secondary)",
					}}
				>
					{expiresAt ? (
						expired ? (
							<span style={{ color: "var(--status-stopped-text)" }}>
								EXPIRED
							</span>
						) : (
							timeLabel
						)
					) : (
						"…"
					)}
				</p>

				{fieldError && (
					<p
						className="mt-3 text-sm"
						style={{ color: "var(--status-stopped-text)" }}
					>
						{fieldError}
					</p>
				)}

				<div className="mt-6 space-y-4">
					<div className="relative">
						<input
							type={showNew ? "text" : "password"}
							placeholder="New Password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 pr-11 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
							style={{
								background: "var(--input-bg)",
								borderColor: "var(--input-border)",
								color: "var(--input-text)",
							}}
						/>
						<button
							type="button"
							onClick={() => setShowNew((v) => !v)}
							className="absolute right-3 top-1/2 -translate-y-1/2"
							style={{ color: "var(--text-muted)" }}
							aria-label="Toggle password visibility"
						>
							{showNew ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>
					{newPassword.length > 0 && newPassword.length < 8 && (
						<p
							className="text-xs"
							style={{ color: "var(--status-stopped-text)" }}
						>
							At least 8 characters required.
						</p>
					)}

					<div className="relative">
						<input
							type={showConfirm ? "text" : "password"}
							placeholder="Confirm Password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 pr-11 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
							style={{
								background: "var(--input-bg)",
								borderColor: "var(--input-border)",
								color: "var(--input-text)",
							}}
						/>
						<button
							type="button"
							onClick={() => setShowConfirm((v) => !v)}
							className="absolute right-3 top-1/2 -translate-y-1/2"
							style={{ color: "var(--text-muted)" }}
							aria-label="Toggle password visibility"
						>
							{showConfirm ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</button>
					</div>
					{confirmPassword.length > 0 && newPassword !== confirmPassword && (
						<p
							className="text-xs"
							style={{ color: "var(--status-stopped-text)" }}
						>
							Passwords do not match.
						</p>
					)}
				</div>

				<button
					type="button"
					onClick={handleSubmit}
					disabled={isPending}
					className="mt-6 h-12 w-full rounded-none border-2 text-sm font-bold uppercase tracking-widest shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:opacity-60"
					style={{
						background: "var(--cta-bg)",
						borderColor: "var(--text-primary)",
						color: "var(--text-primary)",
					}}
				>
					{isPending ? "UPDATING…" : "SET NEW PASSWORD →"}
				</button>
			</div>
		</div>
	);
}
