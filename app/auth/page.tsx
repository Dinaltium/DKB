"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { registerUser } from "@/lib/actions/auth";
import { useTheme } from "@/app/context/ThemeContext";

// ── Google icon SVG ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

type Mode = "login" | "register";

export default function AuthPage() {
  const params        = useSearchParams();
  const router        = useRouter();
  const { isDark }    = useTheme();
  const callbackUrl   = params.get("callbackUrl") ?? "/";
  const urlError      = params.get("error");

  const [mode, setMode]           = useState<Mode>("login");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState(urlError ?? "");
  const [isPending, startTransition] = useTransition();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const handleGoogle = () => {
    signIn("google", { callbackUrl });
  };

  // ── Credentials submit ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    setError("");

    if (mode === "register") {
      if (!name.trim())              return setError("Please enter your name.");
      if (!email.trim())             return setError("Please enter your email.");
      if (password.length < 8)       return setError("Password must be at least 8 characters.");
      if (password !== confirm)      return setError("Passwords do not match.");

      startTransition(async () => {
        const result = await registerUser({ name, email, password });
        if (!result.success) return setError(result.error);

        // Auto-sign-in after registration
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) return setError("Registration succeeded but sign-in failed. Please log in.");
        router.push(callbackUrl);
        router.refresh();
      });
    } else {
      if (!email.trim() || !password) return setError("Please fill in all fields.");

      startTransition(async () => {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) return setError("Invalid email or password.");
        router.push(callbackUrl);
        router.refresh();
      });
    }
  };

  const inputStyle: React.CSSProperties = {
    background:   "var(--input-bg)",
    borderColor:  "var(--input-border)",
    color:        "var(--input-text)",
  };

  return (
    <div
      className="buslink-page flex min-h-screen flex-col items-center justify-center px-4 py-12"
    >
      {/* ── Card ── */}
      <div
        className="w-full max-w-md rounded-none border-2 p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        {/* Logo */}
        <Link href="/" className="block mb-8">
          <p
            className="text-4xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
          >
            BusLink
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mangalore–Udupi Smart Bus Platform
          </p>
        </Link>

        {/* Tab switcher */}
        <div
          className="mb-6 flex border-b-2"
          style={{ borderColor: "var(--border-default)" }}
        >
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest"
              style={{
                color:       mode === m ? "var(--text-primary)"   : "var(--text-muted)",
                borderBottom: mode === m ? "2px solid #F4A522"    : "2px solid transparent",
                marginBottom: "-2px",
              }}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        {mode === "register" && (
          <p className="mt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Operator accounts are created by the admin — not available here.
          </p>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mb-4 rounded-none border-2 border-foreground px-4 py-3 text-sm font-medium normal-case tracking-normal"
            style={{ background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)" }}
          >
            {error === "OAuthAccountNotLinked"
              ? "This email is already registered with a different sign-in method."
              : error}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={isPending}
          className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-none border-2 text-sm font-bold uppercase tracking-wide shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80 disabled:opacity-50"
          style={{
            background:  "var(--bg-surface-2)",
            borderColor: "var(--border-medium)",
            color:       "var(--text-primary)",
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative mb-4 flex items-center gap-3">
          <div className="flex-1 border-t" style={{ borderColor: "var(--border-default)" }} />
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 border-t" style={{ borderColor: "var(--border-default)" }} />
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
              autoComplete="name"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full border-2 px-3 text-sm outline-none"
            style={inputStyle}
            autoComplete="email"
          />

          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isPending && handleSubmit()}
              className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 pr-11 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {mode === "register" && (
            <input
              type={showPass ? "text" : "password"}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isPending && handleSubmit()}
              className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
              autoComplete="new-password"
            />
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] text-sm font-bold uppercase tracking-widest text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:bg-amber-400 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            mode === "login" ? "Sign In" : "Create Account"
          )}
        </button>

        {/* Footnote */}
        {mode === "register" && (
          <p className="mt-4 text-center text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            By registering you agree to BusLink&apos;s terms. Your data is stored
            securely and never sold.
          </p>
        )}

        {/* Operator/admin access note */}
        <div
          className="mt-6 rounded-none border-2 border-foreground px-3 py-2 text-xs font-medium normal-case tracking-normal shadow-[4px_4px_0_hsl(var(--foreground))]"
          style={{
            background:  "var(--bg-surface-2)",
            borderColor: "var(--border-default)",
            color:       "var(--text-muted)",
          }}
        >
          Operators and admins — sign in with your registered email.
          Your dashboard appears automatically based on your account role.
        </div>
      </div>
    </div>
  );
}