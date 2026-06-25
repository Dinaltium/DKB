"use client";

// Thin wrapper around Capacitor plugins.
//
// All helpers are safe to call from any client component: they no-op on the
// web and only reach for native APIs when running inside the Capacitor
// shell. Plugins are dynamically imported so they don't bloat the web
// bundle.

import { Capacitor } from "@capacitor/core";

export type NativePlatform = "web" | "android" | "ios";

export function isNative(): boolean {
	try {
		return Capacitor.isNativePlatform();
	} catch {
		return false;
	}
}

export function getPlatform(): NativePlatform {
	try {
		const p = Capacitor.getPlatform();
		return p === "android" || p === "ios" ? p : "web";
	} catch {
		return "web";
	}
}

// ── App boot: status bar + splash ─────────────────────────────────────────────

export async function setupStatusBar(): Promise<void> {
	if (!isNative()) return;
	const { StatusBar, Style } = await import("@capacitor/status-bar");
	try {
		await StatusBar.setStyle({ style: Style.Dark });
		await StatusBar.setBackgroundColor({ color: "#0D1B2A" });
		await StatusBar.setOverlaysWebView({ overlay: false });
	} catch (err) {
		console.error("[native] status bar setup failed", err);
	}
}

export async function hideSplash(): Promise<void> {
	if (!isNative()) return;
	const { SplashScreen } = await import("@capacitor/splash-screen");
	try {
		await SplashScreen.hide({ fadeOutDuration: 200 });
	} catch (err) {
		console.error("[native] splash hide failed", err);
	}
}

// ── Push notifications ───────────────────────────────────────────────────────

export interface PushRegistration {
	token: string;
	platform: NativePlatform;
}

/**
 * Requests notification permission and registers with FCM/APNS. Resolves
 * with the device token (caller should POST it to a /api/device-tokens
 * endpoint to associate it with the signed-in user).
 *
 * Returns null on the web or if the user declined.
 */
export async function registerPush(): Promise<PushRegistration | null> {
	if (!isNative()) return null;
	const { PushNotifications } = await import("@capacitor/push-notifications");

	const perm = await PushNotifications.requestPermissions();
	if (perm.receive !== "granted") return null;

	return new Promise((resolve) => {
		const cleanup: Array<() => void> = [];

		PushNotifications.addListener("registration", (t) => {
			cleanup.forEach((fn) => fn());
			resolve({ token: t.value, platform: getPlatform() });
		}).then((h) => cleanup.push(() => h.remove()));

		PushNotifications.addListener("registrationError", (err) => {
			console.error("[native] push registration error", err);
			cleanup.forEach((fn) => fn());
			resolve(null);
		}).then((h) => cleanup.push(() => h.remove()));

		PushNotifications.register().catch((err) => {
			console.error("[native] PushNotifications.register failed", err);
			cleanup.forEach((fn) => fn());
			resolve(null);
		});
	});
}

// ── Camera (for ticket OCR) ──────────────────────────────────────────────────

export interface CapturedPhoto {
	dataUrl: string;
	format: string;
}

/**
 * Opens the native camera and returns a data URL of the captured photo.
 * Throws if not running in a Capacitor shell — callers should fall back
 * to the existing browser camera flow.
 */
export async function captureTicketPhoto(): Promise<CapturedPhoto> {
	if (!isNative()) {
		throw new Error("captureTicketPhoto requires the native shell");
	}
	const { Camera, CameraResultType, CameraSource } = await import(
		"@capacitor/camera"
	);
	const photo = await Camera.getPhoto({
		quality: 80,
		allowEditing: false,
		resultType: CameraResultType.DataUrl,
		source: CameraSource.Camera,
		correctOrientation: true,
	});
	return {
		dataUrl: photo.dataUrl ?? "",
		format: photo.format,
	};
}

// ── Geolocation (for live tracking) ──────────────────────────────────────────

export interface Position {
	lat: number;
	lng: number;
	accuracy: number;
	timestamp: number;
}

export async function getCurrentPosition(): Promise<Position | null> {
	if (!isNative()) {
		// Fall back to the browser Geolocation API.
		return new Promise((resolve) => {
			if (typeof navigator === "undefined" || !navigator.geolocation) {
				resolve(null);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					resolve({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
						accuracy: pos.coords.accuracy,
						timestamp: pos.timestamp,
					}),
				() => resolve(null),
				{ enableHighAccuracy: true, timeout: 10_000 },
			);
		});
	}

	const { Geolocation } = await import("@capacitor/geolocation");
	const perm = await Geolocation.requestPermissions();
	if (perm.location !== "granted") return null;
	const pos = await Geolocation.getCurrentPosition({
		enableHighAccuracy: true,
		timeout: 10_000,
	});
	return {
		lat: pos.coords.latitude,
		lng: pos.coords.longitude,
		accuracy: pos.coords.accuracy,
		timestamp: pos.timestamp,
	};
}

/**
 * Subscribes to position updates. Caller must invoke the returned cleanup
 * function to stop the watcher. On web, uses watchPosition; on native,
 * uses Capacitor's watchPosition which can keep running in the background
 * (Android only, requires foreground service permission for true bg use).
 */
export async function watchPosition(
	onUpdate: (pos: Position) => void,
): Promise<() => void> {
	if (!isNative()) {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			return () => undefined;
		}
		const id = navigator.geolocation.watchPosition(
			(pos) =>
				onUpdate({
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					accuracy: pos.coords.accuracy,
					timestamp: pos.timestamp,
				}),
			(err) => console.error("[native] watchPosition error", err),
			{ enableHighAccuracy: true },
		);
		return () => navigator.geolocation.clearWatch(id);
	}

	const { Geolocation } = await import("@capacitor/geolocation");
	const perm = await Geolocation.requestPermissions();
	if (perm.location !== "granted") return () => undefined;

	const watchId = await Geolocation.watchPosition(
		{ enableHighAccuracy: true },
		(pos, err) => {
			if (err || !pos) return;
			onUpdate({
				lat: pos.coords.latitude,
				lng: pos.coords.longitude,
				accuracy: pos.coords.accuracy,
				timestamp: pos.timestamp,
			});
		},
	);

	return () => {
		Geolocation.clearWatch({ id: watchId }).catch(() => undefined);
	};
}

// ── Preferences (small KV store, replaces localStorage on native) ────────────

export async function preferencesGet(key: string): Promise<string | null> {
	if (!isNative()) {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem(key);
	}
	const { Preferences } = await import("@capacitor/preferences");
	const { value } = await Preferences.get({ key });
	return value ?? null;
}

export async function preferencesSet(
	key: string,
	value: string,
): Promise<void> {
	if (!isNative()) {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(key, value);
		return;
	}
	const { Preferences } = await import("@capacitor/preferences");
	await Preferences.set({ key, value });
}
