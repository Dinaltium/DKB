// Renders public/icon.svg into the Android mipmap PNGs that
// android/app/src/main/res/mipmap-*/ expects.
//
// Run after editing public/icon.svg or public/icon-maskable.svg:
//   pnpm tsx scripts/generate-android-icons.mjs
//
// Then: pnpm cap:sync to push the assets into Android's project tree.

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.resolve("public");
const androidRes = path.resolve("android/app/src/main/res");

const anySvg = await fs.readFile(path.join(publicDir, "icon.svg"));
const maskableSvg = await fs.readFile(
	path.join(publicDir, "icon-maskable.svg"),
);

// Legacy launcher icons (square + round use the same source — Android
// applies the round mask at runtime). Sizes in CSS px / dpi.
const LAUNCHER_SIZES = [
	{ dir: "mipmap-mdpi", size: 48 },
	{ dir: "mipmap-hdpi", size: 72 },
	{ dir: "mipmap-xhdpi", size: 96 },
	{ dir: "mipmap-xxhdpi", size: 144 },
	{ dir: "mipmap-xxxhdpi", size: 192 },
];

// Adaptive foreground (Android 8+). The foreground PNG must be 108dp
// rendered into a larger canvas because Android crops to the system
// shape. We use the maskable SVG which already has the safe area.
const FOREGROUND_SIZES = [
	{ dir: "mipmap-mdpi", size: 108 },
	{ dir: "mipmap-hdpi", size: 162 },
	{ dir: "mipmap-xhdpi", size: 216 },
	{ dir: "mipmap-xxhdpi", size: 324 },
	{ dir: "mipmap-xxxhdpi", size: 432 },
];

for (const { dir, size } of LAUNCHER_SIZES) {
	const target = path.join(androidRes, dir);
	await sharp(anySvg)
		.resize(size, size)
		.png()
		.toFile(path.join(target, "ic_launcher.png"));
	await sharp(anySvg)
		.resize(size, size)
		.png()
		.toFile(path.join(target, "ic_launcher_round.png"));
	console.log(`✓ ${dir}/ic_launcher{,_round}.png (${size}px)`);
}

for (const { dir, size } of FOREGROUND_SIZES) {
	const target = path.join(androidRes, dir);
	await sharp(maskableSvg)
		.resize(size, size)
		.png()
		.toFile(path.join(target, "ic_launcher_foreground.png"));
	console.log(`✓ ${dir}/ic_launcher_foreground.png (${size}px)`);
}

// Splash screen 1080×1920 (portrait) — Capacitor's plugin reads from
// android/app/src/main/res/drawable-*/splash.png. Default Capacitor adds
// a single drawable folder. Render a centered logo on the brand bg.
const splashDir = path.join(androidRes, "drawable");
await fs.mkdir(splashDir, { recursive: true });
await sharp({
	create: {
		width: 1080,
		height: 1920,
		channels: 4,
		background: { r: 0x0d, g: 0x1b, b: 0x2a, alpha: 1 },
	},
})
	.composite([
		{
			input: await sharp(anySvg).resize(480, 480).png().toBuffer(),
			gravity: "center",
		},
	])
	.png()
	.toFile(path.join(splashDir, "splash.png"));
console.log("✓ drawable/splash.png (1080×1920)");

console.log(
	"\nDone. Run `pnpm cap:sync` to push these into the Android build.",
);
