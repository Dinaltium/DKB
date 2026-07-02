import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Terms & Conditions · BusLink",
	description: "The terms that govern your use of BusLink.",
};

const UPDATED = "29 June 2026";

export default function TermsPage() {
	return (
		<LegalShell title="Terms & Conditions" updated={UPDATED}>
			<p>
				By creating an account or using BusLink, you agree to these terms.
				Please read them carefully. If you do not agree, do not use the service.
			</p>

			<LegalSection title="1. What BusLink is">
				<p>
					BusLink helps you look up private bus routes on the Mangaluru–Udupi
					corridor, view the expected stops a bus travels through, check fares,
					book tickets, and pay the operator over UPI. BusLink shows{" "}
					<strong>expected routes</strong>, not live GPS tracking — actual bus
					timing and position may differ.
				</p>
			</LegalSection>

			<LegalSection title="2. Eligibility">
				<p>
					You must be at least 18 years old to register. By creating an account
					you confirm that you meet this requirement.
				</p>
			</LegalSection>

			<LegalSection title="3. Payments & fares">
				<ul>
					<li>
						Payments are made directly to the bus operator via UPI.{" "}
						<strong>BusLink does not hold, process, or refund money.</strong>
					</li>
					<li>
						Fares shown are estimates based on route data and may differ from
						the amount a conductor charges. Always confirm the fare before you
						pay.
					</li>
					<li>
						A submitted UPI reference (UTR) indicates a claimed payment. Final
						verification is the operator&rsquo;s responsibility.
					</li>
				</ul>
			</LegalSection>

			<LegalSection title="4. User-generated content">
				<p>
					Complaints, feedback, and any content you submit must be lawful and
					not abusive, defamatory, or infringing. You are responsible for what
					you submit. We may remove content or suspend accounts that violate
					these terms.
				</p>
			</LegalSection>

			<LegalSection title="5. Disclaimer & limitation of liability">
				<p>
					BusLink is provided on an &ldquo;as is&rdquo; basis during this early
					stage. We make no guarantee that bus routes, schedules, fares, seat
					availability, or payment outcomes are accurate or uninterrupted. To
					the maximum extent permitted by law, BusLink is not liable for missed
					buses, incorrect fares, failed or unverified payments, or any indirect
					or consequential loss arising from use of the service.
				</p>
			</LegalSection>

			<LegalSection title="6. Changes">
				<p>
					We may update these terms as the service evolves. Continued use after
					an update means you accept the revised terms.
				</p>
			</LegalSection>

			<LegalSection title="7. Governing law">
				<p>
					These terms are governed by the laws of India, with jurisdiction in
					the courts of Karnataka.
				</p>
			</LegalSection>

			<LegalSection title="8. Contact">
				<p>
					Questions? Email{" "}
					<a href="mailto:support@buslink.app">support@buslink.app</a>.
				</p>
			</LegalSection>
		</LegalShell>
	);
}
