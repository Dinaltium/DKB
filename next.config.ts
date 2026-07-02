import path from "node:path";
import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWAConfig = withPWA({
	dest: "public",
	disable: process.env.NODE_ENV === "development",
	cacheOnFrontEndNav: true,
	aggressiveFrontEndNavCaching: true,
	register: true,
	reloadOnOnline: true,
	workboxOptions: {
		// Fall through to /offline when navigations fail (no network + nothing cached).
		navigateFallback: "/offline",
		navigateFallbackDenylist: [/^\/api\//, /^\/auth/, /^\/onboarding/],
	},
});

// Security response headers applied to every route. `frame-ancestors`/DENY
// stops clickjacking of the payment + complaint actions; nosniff + HSTS +
// referrer policy are baseline hardening. CSP is intentionally permissive on
// scripts/styles (Next inlines runtime + PWA) but locks framing and base-uri.
const SECURITY_HEADERS = [
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-DNS-Prefetch-Control", value: "off" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{
		key: "Permissions-Policy",
		value: "camera=(self), geolocation=(self), microphone=()",
	},
	{
		key: "Content-Security-Policy",
		value: [
			"default-src 'self'",
			"base-uri 'self'",
			"frame-ancestors 'none'",
			"object-src 'none'",
			"img-src 'self' data: blob: https:",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
			"style-src 'self' 'unsafe-inline'",
			"connect-src 'self' https://router.project-osrm.org https://ipapi.co https://*.basemaps.cartocdn.com",
			"font-src 'self' data:",
			"form-action 'self'",
		].join("; "),
	},
];

const nextConfig: NextConfig = {
	turbopack: {},
	poweredByHeader: false,
	async headers() {
		return [{ source: "/:path*", headers: SECURITY_HEADERS }];
	},
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			// Keep webpack's `@/components` resolution in sync with tsconfig paths.
			"@/components": path.resolve(__dirname, "components"),
		};
		return config;
	},
};

export default withPWAConfig(nextConfig);
