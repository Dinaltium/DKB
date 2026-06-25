// UPI intent URL builder + mock/real mode toggle.
//
// MODES
//   real  → emits a standard "upi://pay?..." URL. On Android, this opens the
//           UPI-app chooser (GPay/PhonePe/Paytm/BHIM/etc). On iOS each major
//           app accepts the same scheme. No PSP, no platform-held money — the
//           passenger pays the operator's VPA directly via the UPI rail. We
//           never see the txn until the passenger pastes a UTR back into us.
//
//   mock  → emits "mock-upi://pay?...". The passenger Quick Board page
//           intercepts this and shows a fake-approve screen that generates a
//           pretend UTR, so the rest of the flow (UTR capture, conductor
//           verification, grace expiry) can be exercised end-to-end without
//           a real bank account.
//
// Switch with NEXT_PUBLIC_PAYMENT_MODE=real | mock (default: mock).
// The flag is intentionally NEXT_PUBLIC_ so both server (intent generation)
// and client (mock interception) see the same value.

export type PaymentMode = "mock" | "real";

export function getPaymentMode(): PaymentMode {
	const v = process.env.NEXT_PUBLIC_PAYMENT_MODE;
	return v === "real" ? "real" : "mock";
}

export interface UpiIntentArgs {
	/** Operator's UPI VPA, e.g. "dkbus@hdfcbank". */
	payeeVpa: string;
	/** Operator's display name shown in the UPI app. */
	payeeName: string;
	/** Amount in INR. Decimals allowed; UPI apps accept 2dp. */
	amountInr: number;
	/** Short note shown in the UPI app — we send the ticket UID. */
	txnNote: string;
	/** Optional operator-side reference shown in their bank SMS. */
	txnRef?: string;
}

/**
 * Builds the deep-link URL the passenger taps to start payment.
 *
 * The query order matches the BHIM / NPCI spec — most UPI apps are tolerant,
 * but a few (older Paytm builds) require `pa` first. We keep them ordered
 * defensively.
 */
export function buildUpiIntent(args: UpiIntentArgs): string {
	const scheme = getPaymentMode() === "real" ? "upi" : "mock-upi";
	const params = new URLSearchParams();
	params.set("pa", args.payeeVpa);
	params.set("pn", args.payeeName);
	params.set("am", args.amountInr.toFixed(2));
	params.set("cu", "INR");
	params.set("tn", args.txnNote.slice(0, 50)); // UPI clamps tn to ~80 chars
	if (args.txnRef) params.set("tr", args.txnRef.slice(0, 35));
	return `${scheme}://pay?${params.toString()}`;
}

/**
 * Loose VPA syntax check: "name@handle". Doesn't verify the VPA is real —
 * only NPCI's name-resolve API can do that, and we don't have a PSP. Use
 * for input sanitisation, not as a trust signal.
 */
export function isLikelyValidVpa(input: string): boolean {
	if (!input) return false;
	const v = input.trim();
	if (v.length > 64) return false;
	return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z][a-zA-Z0-9.\-_]{1,}$/.test(v);
}

/**
 * UPI UTR is 12 digits. The reference number variant ("RRN") can be 6–12
 * alphanumeric on some apps; allow that as a softer fallback.
 */
export function isPlausibleUtr(input: string): boolean {
	if (!input) return false;
	const v = input.trim();
	return /^[0-9]{12}$/.test(v) || /^[A-Z0-9]{6,18}$/i.test(v);
}

/**
 * Converts a "upi://pay?..." intent into an Android Intent URL when called
 * from inside the Capacitor WebView shell. The WebView blocks navigations
 * to non-http schemes; the `intent://...#Intent;scheme=upi;end` form is
 * intercepted by Android and routed to the UPI-app chooser.
 *
 * On web (Chrome on Android), plain `upi://` already works — no rewrite.
 * On desktop or iOS, the intent:// form is harmless; the OS just won't
 * find a handler. Callers should fall back to a copy-VPA path there.
 */
export function toNativeLaunchUrl(
	upiIntent: string,
	platform: "web" | "android" | "ios",
): string {
	if (platform !== "android") return upiIntent;
	// upi://pay?pa=foo@bank&am=10  →  intent://pay?pa=foo@bank&am=10#Intent;scheme=upi;end
	const m = upiIntent.match(/^upi:\/\/(.+)$/);
	if (!m) return upiIntent;
	return `intent://${m[1]}#Intent;scheme=upi;end`;
}

/** Generates a mock UTR for the test-mode fake-approve screen. */
export function generateMockUtr(): string {
	// 12 random digits, matches real UTR shape so the rest of the pipeline
	// can't tell a mock UTR from a real one structurally.
	let s = "";
	for (let i = 0; i < 12; i++) s += Math.floor(Math.random() * 10).toString();
	return s;
}
