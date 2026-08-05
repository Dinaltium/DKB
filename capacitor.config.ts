import type { CapacitorConfig } from "@capacitor/cli";

// BusLink Android shell config.
//
// The shell points its WebView at the deployed Vercel URL instead of
// bundling the Next.js build. This is the right trade-off for now:
//   - Every web deploy is instantly live in the app, no recompile.
//   - Auth.js sessions and server actions keep working as-is.
//   - We still get native push, camera, geolocation through the bridge,
//     because the Capacitor JS in the web bundle proxies to the
//     native runtime regardless of where the HTML was loaded from.
//
// For LOCAL DEV against your own dev server:
//   Edit server.url to your LAN IP, e.g. "http://192.168.1.34:3000"
//   then run: pnpm cap:sync && pnpm cap:open:android
// Don't commit that change.
//
// To produce an APK you can hand to a tester:
//   pnpm cap:sync
//   pnpm cap:open:android
//   In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
//   See MOBILE.md for the full runbook.

const config: CapacitorConfig = {
	appId: "com.buslink.app",
	appName: "BusLink",
	// webDir is only used as a fallback when server.url is unreachable.
	// `public` is the smallest valid existing dir.
	webDir: "public",
	server: {
		url: "https://dkb-chi.vercel.app",
		androidScheme: "https",
		cleartext: false,
	},
	android: {
		// Don't let Android scale the WebView when the system font size
		// changes — our BoldKit type is already responsive.
		webContentsDebuggingEnabled: false,
	},
	plugins: {
		SplashScreen: {
			launchShowDuration: 1200,
			launchAutoHide: false,
			backgroundColor: "#0D1B2A",
			androidSplashResourceName: "splash",
			androidScaleType: "CENTER_CROP",
			showSpinner: false,
			splashFullScreen: true,
			splashImmersive: true,
		},
		StatusBar: {
			style: "DARK",
			backgroundColor: "#0D1B2A",
			overlaysWebView: false,
		},
		PushNotifications: {
			presentationOptions: ["badge", "sound", "alert"],
		},
	},
};

export default config;
