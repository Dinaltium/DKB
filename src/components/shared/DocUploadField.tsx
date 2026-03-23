"use client";
// src/components/shared/DocUploadField.tsx
// All document detection logic is INLINED here — no @/lib/ocr import needed.

import { useRef, useState, useEffect } from "react";
import {
  Loader2, ScanLine, UploadCloud, X,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Crop,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OcrDocType =
  | "aadhaar" | "driving_license" | "rc"
  | "puc" | "insurance" | "bus_ticket";

export interface DocUploadFieldProps {
  label:          string;
  placeholder?:   string;
  value:          string;
  onChange:       (value: string) => void;
  docType:        OcrDocType;
  primaryKey:     string;
  onExtraFields?: (fields: Record<string, string | null>) => void;
  disabled?:      boolean;
}

interface DetectionResult {
  dataUrl:   string;
  corners:   Quad | null;
  method:    "crop" | "full";
  cropRatio: number;
}
interface Quad { tl: Pt; tr: Pt; bl: Pt; br: Pt }
interface Pt   { x: number; y: number }
interface Rect { x: number; y: number; w: number; h: number }

type ScanState =
  | { status: "idle" }
  | { status: "detecting" }
  | { status: "scanning"; progress: number; label: string }
  | { status: "done"; confidence: number; rawText: string; method: DetectionResult["method"]; cropRatio: number }
  | { status: "error"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Document detection (canvas-based, runs entirely in browser)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DETECT_PX  = 1000;
const MAX_OUTPUT_PX  = 1400;
const EDGE_THRESHOLD = 30;
const MIN_DOC_RATIO  = 0.10;
const PADDING_RATIO  = 0.015;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function loadImageEl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function toGray(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    out[i] = Math.round(data[p] * 0.299 + data[p+1] * 0.587 + data[p+2] * 0.114);
  }
  return out;
}

function gaussBlur3(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      dst[y*w+x] = (
        src[(y-1)*w+(x-1)] + src[(y-1)*w+x]*2 + src[(y-1)*w+(x+1)] +
        src[y*w+(x-1)]*2   + src[y*w+x]*4      + src[y*w+(x+1)]*2 +
        src[(y+1)*w+(x-1)] + src[(y+1)*w+x]*2 + src[(y+1)*w+(x+1)]
      ) >> 4;
    }
  }
  return dst;
}

function sobel(src: Uint8Array, w: number, h: number, thr: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const tl=src[(y-1)*w+(x-1)], tm=src[(y-1)*w+x], tr=src[(y-1)*w+(x+1)];
      const ml=src[y*w+(x-1)],                          mr=src[y*w+(x+1)];
      const bl=src[(y+1)*w+(x-1)], bm=src[(y+1)*w+x], br=src[(y+1)*w+(x+1)];
      const gx = -tl-2*ml-bl+tr+2*mr+br;
      const gy = -tl-2*tm-tr+bl+2*bm+br;
      dst[y*w+x] = Math.sqrt(gx*gx+gy*gy) > thr ? 1 : 0;
    }
  }
  return dst;
}

function avgArr(a: Float32Array): number {
  let s = 0; for (const v of a) s += v; return s / a.length;
}

function findDocRect(edges: Uint8Array, w: number, h: number): Rect | null {
  const rowD = new Float32Array(h);
  const colD = new Float32Array(w);
  for (let y = 0; y < h; y++) { let c=0; for (let x=0;x<w;x++) c+=edges[y*w+x]; rowD[y]=c/w; }
  for (let x = 0; x < w; x++) { let c=0; for (let y=0;y<h;y++) c+=edges[y*w+x]; colD[x]=c/h; }

  const rt = Math.max(0.03, avgArr(rowD)*1.5);
  const ct = Math.max(0.03, avgArr(colD)*1.5);
  const cy = h>>1, cx = w>>1;
  let top=0, bot=h-1, lft=0, rgt=w-1;

  for (let y=0;y<cy;y++)   { if (rowD[y]>rt) { top=Math.max(0,y-4); break; } }
  for (let y=h-1;y>cy;y--) { if (rowD[y]>rt) { bot=Math.min(h-1,y+4); break; } }
  for (let x=0;x<cx;x++)   { if (colD[x]>ct) { lft=Math.max(0,x-4); break; } }
  for (let x=w-1;x>cx;x--) { if (colD[x]>ct) { rgt=Math.min(w-1,x+4); break; } }

  const rw=rgt-lft, rh=bot-top;
  if (rw*rh < w*h*MIN_DOC_RATIO) return null;

  const px=Math.round(rw*PADDING_RATIO), py=Math.round(rh*PADDING_RATIO);
  return {
    x: Math.max(0, lft-px),
    y: Math.max(0, top-py),
    w: Math.min(w, rgt+px) - Math.max(0, lft-px),
    h: Math.min(h, bot+py) - Math.max(0, top-py),
  };
}

function enhancePx(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const g = Math.round(data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
    const c = Math.min(255, Math.max(0, Math.round(((g-30)/190)*255)));
    data[i] = data[i+1] = data[i+2] = c;
  }
}

async function detectAndCrop(file: File): Promise<DetectionResult> {
  const img = await loadImageEl(file);

  const ds = Math.min(1, MAX_DETECT_PX / Math.max(img.width, img.height));
  const dw = Math.round(img.width*ds), dh = Math.round(img.height*ds);

  const dc = makeCanvas(dw, dh);
  const dx = dc.getContext("2d")!;
  dx.drawImage(img, 0, 0, dw, dh);
  const raw = dx.getImageData(0, 0, dw, dh);

  const gray    = toGray(raw.data, dw, dh);
  const blurred = gaussBlur3(gray, dw, dh);
  const edges   = sobel(blurred, dw, dh, EDGE_THRESHOLD);
  const rect    = findDocRect(edges, dw, dh);

  // Fallback: full image
  if (!rect) {
    const os = Math.min(1, MAX_OUTPUT_PX / Math.max(img.width, img.height));
    const ow = Math.round(img.width*os), oh = Math.round(img.height*os);
    const oc = makeCanvas(ow, oh);
    const octx = oc.getContext("2d")!;
    octx.drawImage(img, 0, 0, ow, oh);
    const id = octx.getImageData(0, 0, ow, oh);
    enhancePx(id.data); octx.putImageData(id, 0, 0);
    return { dataUrl: oc.toDataURL("image/png"), corners: null, method: "full", cropRatio: 1.0 };
  }

  // Scale corners to original coords
  const s = 1/ds;
  const corners: Quad = {
    tl: { x: rect.x*s,           y: rect.y*s },
    tr: { x: (rect.x+rect.w)*s,  y: rect.y*s },
    bl: { x: rect.x*s,           y: (rect.y+rect.h)*s },
    br: { x: (rect.x+rect.w)*s,  y: (rect.y+rect.h)*s },
  };
  const cropRatio = (rect.w*rect.h)/(dw*dh);

  const rawW = Math.round(Math.hypot(corners.tr.x-corners.tl.x, corners.tr.y-corners.tl.y));
  const rawH = Math.round(Math.hypot(corners.bl.x-corners.tl.x, corners.bl.y-corners.tl.y));
  const os   = Math.min(1, MAX_OUTPUT_PX/Math.max(rawW, rawH));
  const ow   = Math.round(rawW*os), oh = Math.round(rawH*os);

  const oc   = makeCanvas(ow, oh);
  const octx = oc.getContext("2d")!;
  octx.drawImage(img, corners.tl.x, corners.tl.y, rawW, rawH, 0, 0, ow, oh);
  const id = octx.getImageData(0, 0, ow, oh);
  enhancePx(id.data); octx.putImageData(id, 0, 0);

  return { dataUrl: oc.toDataURL("image/png"), corners, method: "crop", cropRatio };
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  natW: number, natH: number,
  quad: Quad | null,
  method: "crop" | "full",
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!quad || method === "full") return;

  const sx = canvas.width/natW, sy = canvas.height/natH;
  const pts = [
    { x: quad.tl.x*sx, y: quad.tl.y*sy },
    { x: quad.tr.x*sx, y: quad.tr.y*sy },
    { x: quad.br.x*sx, y: quad.br.y*sy },
    { x: quad.bl.x*sx, y: quad.bl.y*sy },
  ];

  // Dark overlay
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cut out doc region
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Green border
  ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath(); ctx.stroke();

  // Corner handles
  ctx.fillStyle = "#22c55e";
  pts.forEach(p => ctx.fillRect(p.x-5, p.y-5, 10, 10));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tesseract worker cache
// ─────────────────────────────────────────────────────────────────────────────

let _worker:  import("tesseract.js").Worker | null = null;
let _initing  = false;
const _queue: Array<(w: import("tesseract.js").Worker) => void> = [];

async function getWorker(): Promise<import("tesseract.js").Worker> {
  if (_worker) return _worker;
  if (_initing) return new Promise(r => _queue.push(r));
  _initing = true;
  const { createWorker } = await import("tesseract.js");
  const w = await createWorker("eng", 1, { logger: ()=>{}, errorHandler: ()=>{} });
  _worker = w; _initing = false;
  _queue.splice(0).forEach(r => r(w));
  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-docType Tesseract config
// ─────────────────────────────────────────────────────────────────────────────

const DOC_CONFIG: Record<OcrDocType, { psm: number; whitelist: string | null }> = {
  aadhaar:         { psm: 6, whitelist: "0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/:-.," },
  driving_license: { psm: 6, whitelist: "0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/:-.," },
  rc:              { psm: 6, whitelist: "0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/:-.," },
  puc:             { psm: 6, whitelist: "0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/:-.," },
  insurance:       { psm: 6, whitelist: "0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/:-.," },
  bus_ticket:      { psm: 6, whitelist: null },
};

function confColor(pct: number): string {
  if (pct >= 75) return "var(--status-running-text)";
  if (pct >= 50) return "var(--status-delayed-text)";
  return "var(--status-stopped-text)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DocUploadField({
  label, placeholder, value, onChange,
  docType, primaryKey, onExtraFields, disabled,
}: DocUploadFieldProps) {
  const fileRef        = useRef<HTMLInputElement>(null);
  const overlayRef     = useRef<HTMLCanvasElement>(null);
  const imgRef         = useRef<HTMLImageElement>(null);
  const natSizeRef     = useRef<{ w: number; h: number } | null>(null);
  const detResultRef   = useRef<DetectionResult | null>(null);

  const [preview,   setPreview]   = useState<string | null>(null);
  const [fileName,  setFileName]  = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const [showRaw,   setShowRaw]   = useState(false);

  // Pre-warm worker on mount
  useEffect(() => { void getWorker().catch(() => {}); }, []);

  const refreshOverlay = () => {
    const canvas = overlayRef.current;
    const img    = imgRef.current;
    const det    = detResultRef.current;
    const nat    = natSizeRef.current;
    if (!canvas || !img || !det || !nat) return;
    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    drawOverlay(canvas, nat.w, nat.h, det.corners, det.method);
  };

  const handleFile = async (file: File) => {
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);
    setFileName(file.name);
    detResultRef.current = null;
    setScanState({ status: "detecting" });
    setShowRaw(false);

    try {
      // Step 1: detect + crop
      const det = await detectAndCrop(file);
      detResultRef.current = det;

      // Store natural dimensions for overlay
      const tmp = new Image();
      await new Promise<void>(res => {
        tmp.onload = () => { natSizeRef.current = { w: tmp.naturalWidth, h: tmp.naturalHeight }; res(); };
        tmp.src = objUrl;
      });
      refreshOverlay();

      // Step 2: get Tesseract worker
      setScanState({ status: "scanning", progress: 15, label: "Loading OCR engine…" });
      const worker = await getWorker();

      // Step 3: configure per docType
      const cfg = DOC_CONFIG[docType];
      await worker.setParameters({
        tessedit_pageseg_mode: String(cfg.psm) as unknown as import("tesseract.js").PSM,
        ...(cfg.whitelist ? { tessedit_char_whitelist: cfg.whitelist } : {}),
      });

      // Step 4: run OCR on the cropped image
      setScanState({ status: "scanning", progress: 40, label: "Reading document…" });
      const result     = await worker.recognize(det.dataUrl);
      const rawText    = result.data.text;
      const confidence = Math.round(result.data.confidence);

      // Step 5: extract fields via /api/ocr
      setScanState({ status: "scanning", progress: 88, label: "Extracting fields…" });
      const res  = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, docType }),
      });
      const data = await res.json() as {
        success: boolean;
        fields?: Record<string, string | null>;
        error?:  string;
      };

      if (!data.success) {
        setScanState({ status: "error", message: data.error ?? "Extraction failed" });
        return;
      }

      const extracted = data.fields?.[primaryKey];
      if (extracted) onChange(extracted);
      if (onExtraFields && data.fields) onExtraFields(data.fields);

      setScanState({
        status: "done", confidence, rawText,
        method: det.method, cropRatio: det.cropRatio,
      });
    } catch (err) {
      setScanState({ status: "error", message: err instanceof Error ? err.message : "Scan failed" });
    }
  };

  const handleClear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setFileName(null);
    detResultRef.current = null; natSizeRef.current = null;
    setScanState({ status: "idle" }); setShowRaw(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isScanning = scanState.status === "detecting" || scanState.status === "scanning";
  const progressPct =
    scanState.status === "detecting" ? 8 :
    scanState.status === "scanning"  ? scanState.progress : 0;
  const progressLabel =
    scanState.status === "detecting"              ? "Detecting document region…" :
    scanState.status === "scanning" ? scanState.label : "";

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-none border-2 border-foreground"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}
        />
        <input
          ref={fileRef} type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
        />
        <button
          type="button"
          disabled={disabled || isScanning}
          onClick={() => fileRef.current?.click()}
          title="Upload document photo — auto-detects region, then OCR fills the number"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--cta-bg)", color: "var(--text-primary)" }}
        >
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        </button>
      </div>

      {scanState.status === "idle" && !preview && (
        <p className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
          <UploadCloud className="h-3 w-3 shrink-0" />
          Upload a document photo — auto-detects and crops before scanning
        </p>
      )}

      {preview && (
        <div className="rounded-none border-2 border-foreground p-2.5" style={{ background: "var(--bg-surface-2)" }}>
          <div className="flex items-start gap-3">

            {/* Thumbnail + overlay */}
            <div className="relative h-20 w-28 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={preview}
                alt="Document preview"
                className="h-20 w-28 rounded-none border-2 border-foreground object-cover"
                onLoad={refreshOverlay}
              />
              <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Status */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="truncate text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
                {fileName}
              </p>

              {isScanning && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {progressLabel}
                  </span>
                  <div className="h-1 w-full overflow-hidden rounded-none border border-foreground" style={{ background: "var(--bg-surface-3)" }}>
                    <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%`, background: "var(--cta-bg)" }} />
                  </div>
                </div>
              )}

              {scanState.status === "done" && (
                <div className="space-y-0.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--status-running-text)" }}>
                    <CheckCircle2 className="h-3 w-3" />
                    Extracted — review &amp; save
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    <Crop className="h-2.5 w-2.5" />
                    {scanState.method === "crop"
                      ? `Auto-cropped (${Math.round(scanState.cropRatio * 100)}% of image)`
                      : "Full image used"}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: confColor(scanState.confidence) }}>
                    Confidence: {scanState.confidence}%
                    {scanState.confidence < 60 ? " — try a clearer photo" : scanState.confidence < 75 ? " — double-check value" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRaw(v => !v)}
                    className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showRaw ? "Hide" : "Show"} raw OCR text
                  </button>
                </div>
              )}

              {scanState.status === "error" && (
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--status-stopped-text)" }}>
                    <AlertCircle className="h-3 w-3" />
                    {scanState.message}
                  </span>
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-[10px] font-bold uppercase tracking-widest underline" style={{ color: "var(--text-muted)" }}>
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Clear */}
            <button type="button" onClick={handleClear} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border-2 border-foreground transition-colors hover:bg-foreground hover:text-background" title="Clear">
              <X className="h-3 w-3" />
            </button>
          </div>

          {showRaw && scanState.status === "done" && (
            <pre
              className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-none border-2 border-foreground p-2 font-mono text-[10px] leading-relaxed"
              style={{ background: "var(--bg-surface-3)", color: "var(--text-secondary)", maxHeight: "140px" }}
            >
              {scanState.rawText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}