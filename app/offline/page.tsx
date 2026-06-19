import Link from "next/link";

export const metadata = {
	title: "You're offline",
};

export default function OfflinePage() {
	return (
		<main
			className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
			style={{
				background: "var(--bg-page, #0D1B2A)",
				color: "var(--text-primary, #F8FAFC)",
			}}
		>
			<div
				className="w-full max-w-md rounded-none border-2 p-8 neo-shadow"
				style={{
					background: "var(--bg-surface, #1F2937)",
					borderColor: "var(--border-default, #F4C038)",
				}}
			>
				<p
					className="text-xs font-bold uppercase tracking-[0.3em]"
					style={{ color: "var(--text-muted, #94A3B8)" }}
				>
					Offline
				</p>
				<h1
					className="mt-2 text-4xl font-extrabold uppercase leading-tight"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
					}}
				>
					No connection
				</h1>
				<p
					className="mt-3 text-sm"
					style={{ color: "var(--text-muted, #94A3B8)" }}
				>
					You can still see cached pages. Connect to the internet to book a new
					ticket or load live bus locations.
				</p>

				<div className="mt-6 space-y-3">
					<Link
						href="/"
						className="theme-btn-primary brutal-transition brutal-hover flex h-12 w-full items-center justify-center rounded-none border-2 text-sm font-bold uppercase tracking-widest neo-shadow"
					>
						Try home
					</Link>
					<Link
						href="/dashboard"
						className="theme-btn-secondary brutal-transition brutal-hover flex h-12 w-full items-center justify-center rounded-none border-2 text-sm font-bold uppercase tracking-widest neo-shadow"
					>
						My cached tickets
					</Link>
				</div>
			</div>
		</main>
	);
}
