// Home route.
//
// Server component. The landing page is always accessible — including to
// signed-in users, who see a personalized "welcome back" strip with a link
// to their dashboard. Login itself redirects to the dashboard (see the auth
// page's default callbackUrl); this page no longer force-redirects, so a
// signed-in user who explicitly navigates Home actually lands on Home.
//
// Not-yet-onboarded passengers are still pushed to /onboarding by the proxy
// middleware before they reach this page.

import { auth } from "@/auth";
import { LandingClient } from "@/components/home/LandingClient";

export default async function HomePage() {
	const session = await auth();
	const user = session?.user
		? {
				name: session.user.name ?? null,
				role: session.user.role ?? null,
			}
		: null;

	return <LandingClient user={user} />;
}
