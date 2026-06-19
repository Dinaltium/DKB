import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { cn } from "@/lib/utils";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const APP_NAME = "BusLink";
const APP_DEFAULT_TITLE = "BusLink — Mangalore-Udupi Smart Bus Platform";
const APP_DESCRIPTION =
	"Search routes, check fares, book tickets, and track buses between Mangalore and Udupi.";

export const metadata: Metadata = {
	applicationName: APP_NAME,
	title: {
		default: APP_DEFAULT_TITLE,
		template: "%s · BusLink",
	},
	description: APP_DESCRIPTION,
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: APP_NAME,
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: [
			{ url: "/icon.svg", type: "image/svg+xml" },
			{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
			{ url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
		],
		apple: [
			{ url: "/apple-touch-icon.png", sizes: "180x180" },
		],
	},
	openGraph: {
		type: "website",
		siteName: APP_NAME,
		title: APP_DEFAULT_TITLE,
		description: APP_DESCRIPTION,
	},
	twitter: {
		card: "summary",
		title: APP_DEFAULT_TITLE,
		description: APP_DESCRIPTION,
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#F4C038" },
		{ media: "(prefers-color-scheme: dark)", color: "#0D1B2A" },
	],
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={cn("font-sans", geist.variable)}>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600&display=swap"
					rel="stylesheet"
				/>
				<link
					rel="stylesheet"
					href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
					crossOrigin="anonymous"
				/>
			</head>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
