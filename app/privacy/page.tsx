import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy · BusLink",
	description:
		"How BusLink collects, uses, and protects your data. We never sell your data.",
};

const UPDATED = "29 June 2026";

export default function PrivacyPage() {
	return (
		<LegalShell title="Privacy Policy" updated={UPDATED}>
			<p>
				BusLink (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an early-stage bus route
				and ticketing platform for the Mangaluru–Udupi corridor. This policy
				explains what we collect, why, and your rights. We keep data collection
				to the minimum needed to run the service.
			</p>

			<LegalSection title="1. What we collect">
				<ul>
					<li>
						<strong>Account info</strong> — your name, email, and (optionally)
						phone number when you register or sign in with Google.
					</li>
					<li>
						<strong>Location (GPS)</strong> — only when you actively use a
						feature that needs it (e.g. finding nearby stops). We do not track
						your location in the background.
					</li>
					<li>
						<strong>Ticketing info</strong> — trips you book, fare paid, and the
						UPI transaction reference (UTR) you submit so a conductor can verify
						payment. We never see or store your UPI PIN or bank credentials.
					</li>
					<li>
						<strong>Pass applications</strong> — if you apply for a student or
						monthly pass, the details you choose to provide for verification.
					</li>
					<li>
						<strong>Device/session info</strong> — basic browser and approximate
						city, used only to show you your active sign-ins and to keep your
						account secure.
					</li>
				</ul>
				<p>
					We only ask for information that is genuinely required for a feature
					you use. If something is optional, you can skip it.
				</p>
			</LegalSection>

			<LegalSection title="2. How we use it">
				<ul>
					<li>To create your account and show your trips and tickets.</li>
					<li>To compute fares and let conductors verify your payment.</li>
					<li>To respond to complaints and support requests.</li>
					<li>To keep the service secure and prevent fraud.</li>
				</ul>
			</LegalSection>

			<LegalSection title="3. We never sell your data">
				<p>
					We are a small startup just getting going. We do not sell, rent, or
					trade your personal data to anyone. We do not run third-party
					advertising trackers. We share data only with the service providers
					needed to run the app (e.g. our database and hosting), and only as
					required by law.
				</p>
			</LegalSection>

			<LegalSection title="4. Age requirement">
				<p>
					BusLink is intended for users aged 18 and above. We do not knowingly
					collect personal data from children. If you are under 18, please use
					the service only with the involvement of a parent or guardian. If we
					learn we have collected a minor&rsquo;s data without proper consent,
					we will delete it.
				</p>
			</LegalSection>

			<LegalSection title="5. Data retention & security">
				<p>
					We keep your data only as long as your account is active or as needed
					to provide the service and meet legal obligations. Access is
					restricted and protected by authentication. No system is perfectly
					secure, but we take reasonable steps to protect your information.
				</p>
			</LegalSection>

			<LegalSection title="6. Your rights">
				<p>
					You can request access to, correction of, or deletion of your personal
					data, and you can withdraw consent for optional data at any time. To
					do so, contact us at the email below.
				</p>
			</LegalSection>

			<LegalSection title="7. Contact">
				<p>
					Questions about this policy? Email{" "}
					<a href="mailto:support@buslink.app">support@buslink.app</a>.
				</p>
			</LegalSection>
		</LegalShell>
	);
}
