// Registers DK Bus with the AAF11 Nexus Hub once, on server startup.
export async function register() {
	if (process.env.NEXT_RUNTIME !== "nodejs") return;
	const { connector } = await import("@/lib/aaf11");
	const res = await connector.start();
	console.log("[aaf11] Hub registration:", JSON.stringify(res));
}
