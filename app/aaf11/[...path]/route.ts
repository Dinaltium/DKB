import { connector } from "@/lib/aaf11";

// Serves the AAF11 connector endpoints: /aaf11/meta, /health, /metrics,
// /actions, POST /actions/:id, POST /config.
async function handler(req: Request) {
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
