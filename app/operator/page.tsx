// app/operator/page.tsx
// Redirects to the unified /dashboard route.

import { redirect } from "next/navigation";

export default function OperatorPageRedirect() {
	redirect("/dashboard");
}
