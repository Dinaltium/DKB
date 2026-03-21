"use client";

// ⚠ TEST MODE: password expiry is set to 5 MINUTES from account creation.
// To switch to production (7 days), change createOperatorAction in
// lib/actions/bus.ts: replace (5 * 60 * 1000) with (7 * 24 * 60 * 60 * 1000)

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction } from "@/lib/actions/auth";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "PASSWORD EXPIRED";
  const mins = Math.floor(ms / (60 * 1000));
  const days = Math.floor(mins / (24 * 60));
  const hours = Math.floor((mins % (24 * 60)) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ${hours} hour${hours !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { passwordExpiresAt: string | null };
        if (data.passwordExpiresAt) setExpiresAt(new Date(data.passwordExpiresAt));
      } catch {
        // no-op
      }
    };
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const timeLabel = useMemo(() => {
    if (!expiresAt) return "Checking expiry...";
    return formatRemaining(expiresAt.getTime() - now);
  }, [expiresAt, now]);

  const expired = timeLabel === "PASSWORD EXPIRED";

  const handleSubmit = () => {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    startTransition(async () => {
      const result = await changePasswordAction(newPassword);
      if (!result.success) {
        setError(result.error ?? "Unable to update password");
        return;
      }
      toast.success("Password updated!");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="buslink-page flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md border-2 p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", boxShadow: "4px 4px 0 var(--text-primary)" }}
      >
        <Link href="/" className="mb-6 block">
          <p className="text-4xl font-extrabold uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>
            BusLink
          </p>
        </Link>

        <div className="border-2 px-4 py-3 text-center text-sm font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
          ⚠ YOU MUST CHANGE YOUR PASSWORD
        </div>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          Your account was created with a temporary password. Please set a new password to continue.
        </p>

        <p className="mt-3 text-xs font-bold uppercase tracking-wider" style={{ color: expired ? "var(--status-stopped-text)" : "var(--text-secondary)" }}>
          Time remaining: {timeLabel}
        </p>

        {error && (
          <p className="mt-3 text-sm" style={{ color: "var(--status-stopped-text)" }}>
            {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-12 w-full border-2 px-3 pr-11 text-sm outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 w-full border-2 px-3 pr-11 text-sm outline-none"
              style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-4 h-12 w-full border-2 text-sm font-bold uppercase tracking-widest disabled:opacity-60"
          style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)", boxShadow: "3px 3px 0 var(--text-primary)" }}
        >
          {isPending ? "UPDATING..." : "SET NEW PASSWORD →"}
        </button>
      </div>
    </div>
  );
}
