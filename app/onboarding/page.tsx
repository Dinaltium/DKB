import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
	const session = await auth();
	if (!session?.user) redirect("/auth?callbackUrl=/onboarding");
	if (session.user.onboarded) redirect("/");

	return (
		<main className="buslink-page flex min-h-screen flex-col items-center justify-start px-4 pb-24 pt-10 sm:justify-center sm:py-12">
			<div
				className="w-full max-w-md rounded-none border-2 p-6 sm:p-8 neo-shadow"
				style={{
					background: "var(--bg-surface)",
					borderColor: "var(--border-default)",
				}}
			>
				<p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
					Step 1 of 1
				</p>
				<h1
					className="mt-2 text-3xl font-extrabold uppercase leading-tight sm:text-4xl"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					Welcome aboard
				</h1>
				<p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
					Tell us your name and phone so conductors can find you, and so we can
					send ticket updates.
				</p>

				<div className="mt-6">
					<OnboardingForm
						initialName={session.user.name ?? ""}
						initialEmail={session.user.email ?? ""}
					/>
				</div>
			</div>
		</main>
	);
}
