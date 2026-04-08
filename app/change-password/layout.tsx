import { Suspense } from "react";

export default function ChangePasswordLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense
			fallback={
				<div className="buslink-page flex min-h-screen items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--cta-bg)] border-t-transparent" />
				</div>
			}
		>
			{children}
		</Suspense>
	);
}
