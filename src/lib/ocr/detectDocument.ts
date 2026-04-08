// lib/ocr/detectDocument.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side document region detector using canvas pixel manipulation.
// Import as: import { detectAndCropDocument } from "@/lib/ocr/detectDocument"
//
// Pipeline:
//   1. Grayscale
//   2. Gaussian blur 3×3 — reduces noise before edge detection
//   3. Sobel edge detection — finds high-contrast boundaries
//   4. Row/column density scan — locates the document bounding rect
//   5. Crop + contrast enhancement of the detected region
//   6. Returns a PNG data URL ready for Tesseract
//
// Falls back to the full pre-processed image if no clear document is found.
// ─────────────────────────────────────────────────────────────────────────────

export interface DetectionResult {
	dataUrl: string; // cropped + processed PNG for Tesseract
	corners: Quad | null; // detected corners in ORIGINAL image coords
	method: "crop" | "full"; // whether a crop was applied
	cropRatio: number; // fraction of original image used (1.0 = full)
}

export interface Quad {
	tl: Point;
	tr: Point;
	bl: Point;
	br: Point;
}

interface Point {
	x: number;
	y: number;
}
interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_PROCESS_PX = 1000; // downscale for detection pass (speed)
const MAX_OUTPUT_PX = 1400; // final output for Tesseract (quality)
const EDGE_THRESHOLD = 30; // Sobel magnitude threshold 0-255
const MIN_DOC_RATIO = 0.1; // doc must be ≥ 10% of image area
const PADDING_RATIO = 0.015; // slight padding around detected region

// ── Entry point ───────────────────────────────────────────────────────────────

export async function detectAndCropDocument(
	file: File,
): Promise<DetectionResult> {
	const img = await loadImage(file);

	// ── 1. Downscale for detection pass ──────────────────────────────────────
	const detectScale = Math.min(
		1,
		MAX_PROCESS_PX / Math.max(img.width, img.height),
	);
	const dw = Math.round(img.width * detectScale);
	const dh = Math.round(img.height * detectScale);

	const dCanvas = makeCanvas(dw, dh);
	const dctx = dCanvas.getContext("2d")!;
	dctx.drawImage(img, 0, 0, dw, dh);

	const raw = dctx.getImageData(0, 0, dw, dh);

	// ── 2. Grayscale ──────────────────────────────────────────────────────────
	const gray = toGrayscale(raw.data, dw, dh);

	// ── 3. Gaussian blur 3×3 ─────────────────────────────────────────────────
	const blurred = gaussianBlur3(gray, dw, dh);

	// ── 4. Sobel edges ────────────────────────────────────────────────────────
	const edges = sobelEdges(blurred, dw, dh, EDGE_THRESHOLD);

	// ── 5. Find document bounding rect ───────────────────────────────────────
	const rect = findDocumentRect(edges, dw, dh);

	if (!rect) {
		return {
			dataUrl: await preprocessFull(img, MAX_OUTPUT_PX),
			corners: null,
			method: "full",
			cropRatio: 1.0,
		};
	}

	// Scale corners back to original image coordinates
	const s = 1 / detectScale;
	const corners: Quad = {
		tl: { x: rect.x * s, y: rect.y * s },
		tr: { x: (rect.x + rect.w) * s, y: rect.y * s },
		bl: { x: rect.x * s, y: (rect.y + rect.h) * s },
		br: { x: (rect.x + rect.w) * s, y: (rect.y + rect.h) * s },
	};

	const cropRatio = (rect.w * rect.h) / (dw * dh);
	const dataUrl = await cropAndEnhance(img, corners, MAX_OUTPUT_PX);

	return { dataUrl, corners, method: "crop", cropRatio };
}

// ── Grayscale (BT.601 luminance) ──────────────────────────────────────────────

function toGrayscale(
	data: Uint8ClampedArray,
	w: number,
	h: number,
): Uint8Array {
	const out = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) {
		const p = i * 4;
		out[i] = Math.round(
			data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114,
		);
	}
	return out;
}

// ── 3×3 Gaussian blur ─────────────────────────────────────────────────────────

function gaussianBlur3(src: Uint8Array, w: number, h: number): Uint8Array {
	const dst = new Uint8Array(w * h);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const i = y * w + x;
			dst[i] =
				(src[(y - 1) * w + (x - 1)] * 1 +
					src[(y - 1) * w + x] * 2 +
					src[(y - 1) * w + (x + 1)] * 1 +
					src[y * w + (x - 1)] * 2 +
					src[y * w + x] * 4 +
					src[y * w + (x + 1)] * 2 +
					src[(y + 1) * w + (x - 1)] * 1 +
					src[(y + 1) * w + x] * 2 +
					src[(y + 1) * w + (x + 1)] * 1) >>
				4;
		}
	}
	return dst;
}

// ── Sobel edge detection ──────────────────────────────────────────────────────

function sobelEdges(
	src: Uint8Array,
	w: number,
	h: number,
	threshold: number,
): Uint8Array {
	const dst = new Uint8Array(w * h);
	for (let y = 1; y < h - 1; y++) {
		for (let x = 1; x < w - 1; x++) {
			const tl = src[(y - 1) * w + (x - 1)],
				tm = src[(y - 1) * w + x],
				tr = src[(y - 1) * w + (x + 1)];
			const ml = src[y * w + (x - 1)],
				mr = src[y * w + (x + 1)];
			const bl = src[(y + 1) * w + (x - 1)],
				bm = src[(y + 1) * w + x],
				br = src[(y + 1) * w + (x + 1)];
			const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
			const gy = -tl - 2 * tm - tr + bl + 2 * bm + br;
			dst[y * w + x] = Math.sqrt(gx * gx + gy * gy) > threshold ? 1 : 0;
		}
	}
	return dst;
}

// ── Find document bounding rectangle ─────────────────────────────────────────

function findDocumentRect(
	edges: Uint8Array,
	w: number,
	h: number,
): Rect | null {
	const STRIP = 4;

	// Row and column edge density projections
	const rowDensity = new Float32Array(h);
	for (let y = 0; y < h; y++) {
		let c = 0;
		for (let x = 0; x < w; x++) c += edges[y * w + x];
		rowDensity[y] = c / w;
	}

	const colDensity = new Float32Array(w);
	for (let x = 0; x < w; x++) {
		let c = 0;
		for (let y = 0; y < h; y++) c += edges[y * w + x];
		colDensity[x] = c / h;
	}

	const rowThresh = Math.max(0.03, average(rowDensity) * 1.5);
	const colThresh = Math.max(0.03, average(colDensity) * 1.5);

	const cy = h >> 1,
		cx = w >> 1;
	let top = 0,
		bottom = h - 1,
		left = 0,
		right = w - 1;

	for (let y = 0; y < cy; y++) {
		if (rowDensity[y] > rowThresh) {
			top = Math.max(0, y - STRIP);
			break;
		}
	}
	for (let y = h - 1; y > cy; y--) {
		if (rowDensity[y] > rowThresh) {
			bottom = Math.min(h - 1, y + STRIP);
			break;
		}
	}
	for (let x = 0; x < cx; x++) {
		if (colDensity[x] > colThresh) {
			left = Math.max(0, x - STRIP);
			break;
		}
	}
	for (let x = w - 1; x > cx; x--) {
		if (colDensity[x] > colThresh) {
			right = Math.min(w - 1, x + STRIP);
			break;
		}
	}

	const rw = right - left;
	const rh = bottom - top;

	if (rw * rh < w * h * MIN_DOC_RATIO) return null;

	const padX = Math.round(rw * PADDING_RATIO);
	const padY = Math.round(rh * PADDING_RATIO);

	return {
		x: Math.max(0, left - padX),
		y: Math.max(0, top - padY),
		w: Math.min(w, right + padX) - Math.max(0, left - padX),
		h: Math.min(h, bottom + padY) - Math.max(0, top - padY),
	};
}

// ── Crop + enhance ────────────────────────────────────────────────────────────

async function cropAndEnhance(
	img: HTMLImageElement,
	corners: Quad,
	maxPx: number,
): Promise<string> {
	const rawW = Math.round(
		Math.hypot(corners.tr.x - corners.tl.x, corners.tr.y - corners.tl.y),
	);
	const rawH = Math.round(
		Math.hypot(corners.bl.x - corners.tl.x, corners.bl.y - corners.tl.y),
	);
	const scale = Math.min(1, maxPx / Math.max(rawW, rawH));
	const outW = Math.round(rawW * scale);
	const outH = Math.round(rawH * scale);

	const canvas = makeCanvas(outW, outH);
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(img, corners.tl.x, corners.tl.y, rawW, rawH, 0, 0, outW, outH);

	const imageData = ctx.getImageData(0, 0, outW, outH);
	enhancePixels(imageData.data);
	ctx.putImageData(imageData, 0, 0);

	return canvas.toDataURL("image/png");
}

// ── Full-image fallback ───────────────────────────────────────────────────────

async function preprocessFull(
	img: HTMLImageElement,
	maxPx: number,
): Promise<string> {
	const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
	const w = Math.round(img.width * scale);
	const h = Math.round(img.height * scale);
	const canvas = makeCanvas(w, h);
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(img, 0, 0, w, h);
	const imageData = ctx.getImageData(0, 0, w, h);
	enhancePixels(imageData.data);
	ctx.putImageData(imageData, 0, 0);
	return canvas.toDataURL("image/png");
}

// ── Pixel enhancement: grayscale + contrast stretch ───────────────────────────

function enhancePixels(data: Uint8ClampedArray): void {
	for (let i = 0; i < data.length; i += 4) {
		const gray = Math.round(
			data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
		);
		const c = Math.min(255, Math.max(0, Math.round(((gray - 30) / 190) * 255)));
		data[i] = data[i + 1] = data[i + 2] = c;
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Image load failed"));
		};
		img.src = url;
	});
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
}

function average(arr: Float32Array): number {
	let sum = 0;
	for (const v of arr) sum += v;
	return sum / arr.length;
}
