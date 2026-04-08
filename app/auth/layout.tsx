import { Suspense } from "react";
import AuthPage from "./page";

export default function AuthLayout() {
	return (
		<Suspense
			fallback={
				<div className="buslink-page flex min-h-screen items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F4A522] border-t-transparent" />
				</div>
			}
		>
			<AuthPage />
		</Suspense>
	);
}
