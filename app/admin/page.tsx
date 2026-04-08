// app/admin/page.tsx
// The old standalone admin page is replaced by the unified /dashboard route.
// Middleware already redirects /admin → /dashboard but this stub prevents
// a 404 if someone navigates directly before middleware fires.

import { redirect } from "next/navigation";

export default function AdminPageRedirect() {
	redirect("/dashboard");
}
