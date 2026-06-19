"use client";

import {
	Bus,
	Home,
	LayoutDashboard,
	LogIn,
	LogOut,
	Search,
	Settings as SettingsIcon,
	ShieldCheck,
	Ticket,
	User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	matchPrefix?: string;
	badge?: number;
	onClick?: () => void;
}

interface BottomNavProps {
	pendingCount?: number;
}

export function BottomNav({ pendingCount = 0 }: BottomNavProps) {
	const pathname = usePathname();
	const { data: session } = useSession();
	const role = session?.user?.role;

	const items = buildItems(role, pendingCount);

	return (
		<nav
			className="theme-nav-shell fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-flow-col auto-cols-fr items-stretch border-t-4 md:hidden"
			style={{
				paddingBottom: "env(safe-area-inset-bottom, 0px)",
			}}
			aria-label="Primary"
		>
			{items.map((item) => {
				const Icon = item.icon;
				const isActive = item.matchPrefix
					? pathname === item.matchPrefix ||
						pathname.startsWith(`${item.matchPrefix}/`)
					: pathname === item.href;

				const className = `relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
					isActive ? "theme-nav-item-active" : "theme-nav-item-idle"
				}`;

				const content = (
					<>
						<Icon className="h-5 w-5" />
						<span>{item.label}</span>
						{item.badge && item.badge > 0 ? (
							<span className="theme-counter absolute right-3 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-none border-2 px-1 text-[9px] font-black">
								{item.badge > 99 ? "99+" : item.badge}
							</span>
						) : null}
					</>
				);

				if (item.onClick) {
					return (
						<button
							key={item.label}
							type="button"
							onClick={item.onClick}
							className={className}
						>
							{content}
						</button>
					);
				}

				return (
					<Link key={item.label} href={item.href} className={className}>
						{content}
					</Link>
				);
			})}
		</nav>
	);
}

function buildItems(
	role: string | undefined,
	pendingCount: number,
): NavItem[] {
	if (!role) {
		// Unauthenticated
		return [
			{ href: "/", label: "Home", icon: Home, matchPrefix: "/" },
			{
				href: "/search",
				label: "Search",
				icon: Search,
				matchPrefix: "/search",
			},
			{
				href: "/trips",
				label: "Trips",
				icon: Bus,
				matchPrefix: "/trips",
			},
			{ href: "/auth", label: "Sign in", icon: LogIn, matchPrefix: "/auth" },
		];
	}

	if (role === "passenger") {
		return [
			{ href: "/", label: "Home", icon: Home, matchPrefix: "/" },
			{
				href: "/search",
				label: "Search",
				icon: Search,
				matchPrefix: "/search",
			},
			{
				href: "/dashboard",
				label: "Tickets",
				icon: Ticket,
				matchPrefix: "/dashboard",
			},
			{
				href: "/settings",
				label: "Account",
				icon: User,
				matchPrefix: "/settings",
			},
		];
	}

	if (role === "operator") {
		return [
			{
				href: "/dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				matchPrefix: "/dashboard",
			},
			{
				href: "/search",
				label: "Search",
				icon: Search,
				matchPrefix: "/search",
			},
			{
				href: "/settings",
				label: "Settings",
				icon: SettingsIcon,
				matchPrefix: "/settings",
			},
			{
				href: "#",
				label: "Sign out",
				icon: LogOut,
				onClick: () => signOut({ callbackUrl: "/" }),
			},
		];
	}

	if (role === "conductor") {
		return [
			{
				href: "/conductor",
				label: "Trip",
				icon: Bus,
				matchPrefix: "/conductor",
			},
			{
				href: "/search",
				label: "Search",
				icon: Search,
				matchPrefix: "/search",
			},
			{
				href: "/settings",
				label: "Account",
				icon: User,
				matchPrefix: "/settings",
			},
			{
				href: "#",
				label: "Sign out",
				icon: LogOut,
				onClick: () => signOut({ callbackUrl: "/" }),
			},
		];
	}

	// admin
	return [
		{
			href: "/dashboard",
			label: "Admin",
			icon: ShieldCheck,
			matchPrefix: "/dashboard",
			badge: pendingCount,
		},
		{ href: "/search", label: "Search", icon: Search, matchPrefix: "/search" },
		{
			href: "/settings",
			label: "Settings",
			icon: SettingsIcon,
			matchPrefix: "/settings",
		},
		{
			href: "#",
			label: "Sign out",
			icon: LogOut,
			onClick: () => signOut({ callbackUrl: "/" }),
		},
	];
}
