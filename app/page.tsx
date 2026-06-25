// Home route.
//
// Server component. Logged-in users go straight to their role-appropriate
// dashboard; logged-out users see the marketing landing. This way a
// returning user opening buslink.com lands on their tickets / fleet view
// rather than the public hero.

import { auth } from "@/auth";
import { LandingClient } from "@/components/home/LandingClient";
import { redirect } from "next/navigation";

export default async function HomePage() {
	const session = await auth();
	const role = session?.user?.role;

	if (role === "conductor") redirect("/conductor");
	if (role === "operator" || role === "admin" || role === "passenger") {
		redirect("/dashboard");
	}

	return <LandingClient />;
}
