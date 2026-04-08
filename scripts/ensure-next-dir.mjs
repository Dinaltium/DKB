import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectDir = process.cwd();
const distLink = path.join(projectDir, ".next");

function ensureDir(p) {
	fs.mkdirSync(p, { recursive: true });
}

function safeRemove(p) {
	try {
		fs.rmSync(p, { recursive: true, force: true });
	} catch {
		// ignore
	}
}

try {
	if (os.platform() === "win32") {
		// Prefer a highly-writable location on Windows. Some setups (CFA/AV policies)
		// can block writes to repo folders and even LocalAppData.
		const target =
			process.env.DKBUS_NEXT_DIST_TARGET ||
			path.join(os.tmpdir(), "dkbus-next");
		ensureDir(target);

		// If `.nextwin` already exists (dir or broken link), replace it with a junction.
		safeRemove(distLink);
		fs.symlinkSync(target, distLink, "junction");
	} else {
		ensureDir(distLink);
	}
} catch (err) {
	// If the link/dir cannot be created, Next will fail fast anyway.
	console.error("[predev] Failed to prepare distDir:", err);
	process.exit(1);
}
