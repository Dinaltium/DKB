import Link from "next/link";

export default function Forbidden() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
			<p
				className="text-6xl font-black uppercase sm:text-8xl"
				style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
			>
				403
			</p>
			<p className="max-w-md text-center text-muted-foreground">
				You do not have permission to view this page.
			</p>
			<div className="flex flex-wrap justify-center gap-3">
				<Link
					href="/"
					className="inline-flex h-10 items-center rounded-none border-2 border-foreground bg-primary px-6 text-sm font-bold uppercase text-primary-foreground shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
				>
					Go home
				</Link>
				<Link
					href="/auth"
					className="inline-flex h-10 items-center rounded-none border-2 border-foreground bg-background px-6 text-sm font-bold uppercase text-foreground shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
				>
					Sign in
				</Link>
			</div>
		</div>
	);
}
