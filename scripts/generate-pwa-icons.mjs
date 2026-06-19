// Renders public/icon.svg and public/icon-maskable.svg into the PNG sizes
// that PWA manifests, Apple touch icons, and Windows tiles expect.
//
// Run after editing either SVG: pnpm tsx scripts/generate-pwa-icons.mjs
// (sharp is pulled in transitively via @vitejs/plugin-react / tesseract.js).

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.resolve("public");
const sourceAny = path.join(publicDir, "icon.svg");
const sourceMask = path.join(publicDir, "icon-maskable.svg");

const renders = [
	{ source: sourceAny, size: 192, out: "icon-192.png" },
	{ source: sourceAny, size: 384, out: "icon-384.png" },
	{ source: sourceAny, size: 512, out: "icon-512.png" },
	{ source: sourceMask, size: 192, out: "icon-maskable-192.png" },
	{ source: sourceMask, size: 512, out: "icon-maskable-512.png" },
	{ source: sourceAny, size: 180, out: "apple-touch-icon.png" },
	{ source: sourceAny, size: 32, out: "favicon-32.png" },
	{ source: sourceAny, size: 16, out: "favicon-16.png" },
];

for (const { source, size, out } of renders) {
	const buffer = await fs.readFile(source);
	const target = path.join(publicDir, out);
	await sharp(buffer).resize(size, size).png().toFile(target);
	console.log(`✓ ${out} (${size}px)`);
}

console.log("Done. Don't forget to commit the new PNGs.");
