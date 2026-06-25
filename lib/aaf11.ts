import { AAF11Connector } from "aaf11-sdk";
import type { Environment } from "aaf11-sdk";

/**
 * AAF11 Nexus connector for DK Bus. Exposes /aaf11/* (see app/aaf11/[...path])
 * and registers with the Hub on boot (see instrumentation.ts).
 */

// Soft "disabled" state toggled by the kill switch. Health reflects it; restart
// clears it. Doesn't kill the dev server — flip your real service state here.
let disabled = false;

export const connector = new AAF11Connector({
	projectKey: process.env.AAF11_PROJECT_KEY ?? "proj_dkbus_001",
	memberToken: process.env.AAF11_MEMBER_TOKEN ?? "",
	name: "DK Bus",
	version: "0.1.0",
	environment: (process.env.AAF11_ENVIRONMENT as Environment) ?? "development",
	hubUrl: process.env.AAF11_HUB_URL ?? "http://localhost:3000",
	connectorUrl: process.env.AAF11_CONNECTOR_URL ?? "http://localhost:3002",
	description: "DK Bus — real-time bus tracking.",
	tags: ["web", "transit", "nextjs"],
	healthProvider: () => (disabled ? "down" : "healthy"),
});

// Control actions the Hub/desktop can trigger. Replace bodies with real logic.
connector.registerAction("ping", () => ({ pong: true }), { label: "Ping" });

connector.registerAction(
	"clear_cache",
	() => {
		console.log("[aaf11] clear_cache");
		// e.g. await cache.flush()
		return { cleared: true };
	},
	{ label: "Clear cache" },
);

connector.registerAction(
	"restart",
	() => {
		console.log("[aaf11] restart — clearing disabled state");
		disabled = false;
		// In production: graceful shutdown so the process manager restarts you.
		return { restarting: true };
	},
	{ label: "Restart" },
);

connector.registerAction(
	"rollback",
	() => {
		console.log("[aaf11] rollback requested");
		return { rolledBack: true };
	},
	{ label: "Rollback" },
);

connector.registerAction(
	"kill",
	() => {
		console.log("[aaf11] kill — entering disabled state");
		disabled = true;
		return { killed: true };
	},
	{
		label: "Kill switch",
		description: "Disable the service (health goes down)",
	},
);
