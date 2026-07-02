import { connector } from "@/lib/aaf11";

// Serves the AAF11 connector endpoints: /aaf11/meta, /health, /metrics,
// /actions, POST /actions/:id, POST /config.
//
// Security: read-only GETs (meta/health/metrics/actions list) stay public.
// Mutating calls (POST — runs control actions like kill/restart/rollback,
// and /config) require the shared member token. Fail-closed: if no token is
// configured on the server, mutating calls are rejected unless the operator
// explicitly opts into unauthenticated mode for local testing.
function authorizeMutation(req: Request): { ok: true } | { ok: false } {
	const expected = process.env.AAF11_MEMBER_TOKEN;
	const allowUnauth = process.env.AAF11_ALLOW_UNAUTH === "true";

	if (!expected) return { ok: allowUnauth };

	const provided =
		req.headers.get("x-aaf11-token") ??
		req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
	return { ok: provided === expected };
}

async function handler(req: Request) {
	if (req.method !== "GET") {
		if (!authorizeMutation(req).ok) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
	}

	const url = new URL(req.url);
	const body =
		req.method !== "GET" ? await req.json().catch(() => undefined) : undefined;
	const { status, body: out } = await connector.handle({
		method: req.method,
		path: url.pathname,
		headers: Object.fromEntries(req.headers),
		body,
	});
	return Response.json(out, { status });
}

export const GET = handler;
export const POST = handler;
export const dynamic = "force-dynamic";
