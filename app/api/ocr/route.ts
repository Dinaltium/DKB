// app/api/ocr/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Thin extraction-only endpoint.
// Tesseract OCR now runs CLIENT-SIDE (browser WASM) — fast, cached, no
// server round-trip for the heavy part.
//
// This route only handles the regex extraction step:
//   POST { rawText: string, docType: string }
//   → { success: true, fields: Record<string, string|null> }
//
// Keeping it as a route means:
//   • Server-side callers (future admin scripts, batch jobs) can still use it
//   • The extraction logic lives in one place, not duplicated client/server
//   • DocUploadField calls this AFTER Tesseract finishes in the browser
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Field extraction rules ────────────────────────────────────────────────────

type DocRules = Record<string, RegExp[]>;

const RULES: Record<string, DocRules> = {
  aadhaar: {
    aadhaar_number: [
      /\b(\d{4}\s\d{4}\s\d{4})\b/,
      /\b(\d{4}-\d{4}-\d{4})\b/,
      /\b(\d{12})\b/,
    ],
    name: [
      /(?:name|नाम)[:\s]+([A-Z][a-zA-Z\s]{2,35})/i,
    ],
    dob: [
      /(?:dob|d\.o\.b|date\s*of\s*birth)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
    ],
  },

  driving_license: {
    dl_number: [
      /\b([A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7})\b/i,
      /\b([A-Z]{2}\d{13})\b/i,
      /(?:dl\s*(?:no|number)|licence\s*no|license\s*no)[:\s]*([A-Z0-9\-\s]{8,20})/i,
    ],
    name: [
      /(?:name|holder|licensee)[:\s]+([A-Z][a-zA-Z\s]{2,35})/i,
    ],
    valid_till: [
      /(?:valid\s*(?:till|upto|through)|expiry|exp\.?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ],
    dob: [
      /(?:dob|date\s*of\s*birth)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ],
  },

  rc: {
    rc_number: [
      /\b([A-Z]{2}[-\s]\d{2}[-\s][A-Z]{1,3}[-\s]\d{4})\b/i,
      /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/i,
      /(?:reg(?:istration)?\s*(?:no|number))[:\s]*([A-Z0-9\s\-]{6,16})/i,
    ],
    owner_name: [
      /(?:owner|registered\s*owner|name\s*of\s*owner|name)[:\s]+([A-Z][a-zA-Z\s]{2,35})/i,
    ],
    vehicle_class: [
      /(?:vehicle\s*class|class\s*of\s*vehicle|class)[:\s]+([A-Z0-9\/\s]{2,20})/i,
    ],
  },

  puc: {
    puc_number: [
      /\b(PUC\/\d{4,}\/\d{2,})\b/i,
      /(?:puc|certificate\s*no|cert\.?\s*no)[:\s]*([A-Z0-9\/\-]{5,20})/i,
      /\b([A-Z]{2,4}\d{6,12})\b/,
    ],
    vehicle_number: [
      /\b([A-Z]{2}[-\s]\d{2}[-\s][A-Z]{1,3}[-\s]\d{4})\b/i,
      /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/i,
    ],
    valid_till: [
      /(?:valid|expiry|valid\s*(?:till|upto))[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ],
  },

  insurance: {
    policy_number: [
      /(?:policy\s*(?:no|number))[:\s]*([A-Z0-9\-\/]{8,25})/i,
      /\b([A-Z]{1,4}[\/\-]?\d{8,18})\b/,
    ],
    insurer: [
      /(?:insurer|insurance\s*company|underwritten\s*by)[:\s]+([A-Z][a-zA-Z\s&\.]{3,50})/i,
    ],
    vehicle_number: [
      /\b([A-Z]{2}[-\s]\d{2}[-\s][A-Z]{1,3}[-\s]\d{4})\b/i,
    ],
    valid_till: [
      /(?:policy\s*expiry|valid\s*(?:till|upto|through)|expiry)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ],
  },

  bus_ticket: {
    bus_number: [
      /(?:bus|vehicle|route)[:\s#]*([A-Z]{2,4}[-\s]?\d{2,3}[-\s]?[A-Z]{0,3}[-\s]?\d{0,4})/i,
    ],
    from_stop: [
      /(?:from|boarding|origin)[:\s]+([A-Za-z\s]{3,35}?)(?:\n|\s{2,}|to\s)/i,
    ],
    to_stop: [
      /(?:\bto\b|destination)[:\s]+([A-Za-z\s]{3,35})(?:\n|\s{2,}|₹|\d)/i,
    ],
    fare: [
      /(?:fare|amount|total)[:\s]*₹?\s*(\d{1,4}(?:\.\d{2})?)/i,
      /₹\s*(\d{1,4})/,
      /Rs\.?\s*(\d{1,4})/i,
    ],
    ticket_date: [
      /(?:date|travel\s*date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
    ],
    seat_number: [
      /(?:seat|seat\s*no)[:\s#]*([A-Z]?\d{1,3}[A-Z]?)\b/i,
    ],
  },
};

// ── Extraction helper (also exported for direct server-side use) ──────────────

export function extractFields(
  rawText: string,
  docType: string,
): Record<string, string | null> {
  const rules = RULES[docType];
  if (!rules) return {};

  const text = rawText.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ");
  const result: Record<string, string | null> = {};

  for (const [fieldKey, patterns] of Object.entries(rules)) {
    let matched: string | null = null;
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m?.[1]) {
        matched = m[1].trim().replace(/\s+/g, " ");
        break;
      }
    }
    result[fieldKey] = matched;
  }

  return result;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { rawText, docType } = await req.json() as {
      rawText: string;
      docType: string;
    };

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json(
        { success: false, error: "rawText is required." },
        { status: 400 },
      );
    }

    if (!RULES[docType]) {
      return NextResponse.json(
        { success: false, error: `Unsupported docType: ${docType}` },
        { status: 400 },
      );
    }

    const fields = extractFields(rawText, docType);
    return NextResponse.json({ success: true, fields });
  } catch (err) {
    console.error("[POST /api/ocr]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 },
    );
  }
}