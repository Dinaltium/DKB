import Link from "next/link";

// Shared chrome for static legal pages (privacy, terms). Kept deliberately
// simple and server-renderable — no client hooks — so the content is crawlable
// and links resolve without JS.

export function LegalShell({
	title,
	updated,
	children,
}: {
	title: string;
	updated: string;
	children: React.ReactNode;
}) {
	return (
		<div className="buslink-page min-h-screen">
			<header
				className="sticky top-0 z-30"
				style={{
					background: "var(--header-bg)",
					backdropFilter: "blur(12px)",
					borderBottom: "1px solid var(--header-border)",
				}}
			>
				<div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 md:px-8">
					<Link
						href="/"
						className="text-3xl uppercase tracking-wide"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							fontWeight: 800,
							color: "var(--text-primary)",
						}}
					>
						BusLink
					</Link>
					<nav className="flex gap-4 text-xs font-bold uppercase tracking-wide">
						<Link href="/privacy" style={{ color: "var(--text-secondary)" }}>
							Privacy
						</Link>
						<Link href="/terms" style={{ color: "var(--text-secondary)" }}>
							Terms
						</Link>
					</nav>
				</div>
			</header>

			<main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pt-12">
				<h1
					className="text-3xl font-extrabold uppercase leading-tight sm:text-5xl"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					{title}
				</h1>
				<p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
					Last updated: {updated}
				</p>

				<div
					className="legal-prose mt-8 space-y-6 text-sm leading-relaxed"
					style={{ color: "var(--text-secondary)" }}
				>
					{children}
				</div>

				<div className="mt-12">
					<Link
						href="/"
						className="theme-btn-secondary brutal-transition brutal-hover inline-flex h-10 items-center rounded-none border-2 px-4 text-xs font-bold uppercase tracking-wide neo-shadow"
						style={{ color: "var(--text-primary)" }}
					>
						← Back to BusLink
					</Link>
				</div>
			</main>
		</div>
	);
}

export function LegalSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-2">
			<h2
				className="text-lg font-black uppercase tracking-wide"
				style={{ color: "var(--text-primary)" }}
			>
				{title}
			</h2>
			{children}
		</section>
	);
}
