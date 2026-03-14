import type { Language } from "./types";

export const LANGUAGE_OPTIONS: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "tcy", label: "ತುಳು" },
  { code: "be", label: "Beary" },
];

export const TEXTS = {
  en: {
    // ── Brand & nav ──
    brand: "BusLink",
    tagline: "Scan. Know. Pay. Travel.",
    searchRoute: "Search a Route",
    scanQr: "Scan QR Code",
    routeSearch: "Route Search",
    busDetail: "Bus Detail",
    operator: "Operator",
    admin: "Admin",
    currentStop: "Current stop",
    payNow: "Pay via UPI",
    complaint: "Complaint / Feedback",
    liveStatus: "Live crowd status",
    // ── Landing page ──
    corridorSubtitle: "Private bus corridor support for Mangalore ↔ Udupi",
    heroMvpLabel: "BusLink Corridor MVP",
    heroDesc:
      "Search buses instantly, scan QR at stop, know exact fare, and pay securely with a mobile-first experience. Serving private operators between Mangalore and Udupi.",
    stat1: "Commuters report fare mismatch or overcharging",
    stat2: "Official digital route info tools on this corridor",
    stat3: "Passengers say complaints are never tracked",
    feat1: "Route search with fare and seat visibility",
    feat2: "UPI-ready mock payment journey in 2 taps",
    feat3: "Complaint logging linked to bus number",
    liveNow: "Buses Running Now",
    track: "Track",
  },
  kn: {
    // ── Brand & nav ── (Google Translate verified)
    brand: "ಬಸ್‌ಲಿಂಕ್",
    tagline: "ಸ್ಕ್ಯಾನ್ ಮಾಡಿ. ತಿಳಿದುಕೊಳ್ಳಿ. ಪಾವತಿಸಿ. ಪ್ರಯಾಣಿಸಿ.",
    searchRoute: "ಮಾರ್ಗ ಹುಡುಕಿ",
    scanQr: "QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    routeSearch: "ಮಾರ್ಗ ಹುಡುಕಾಟ",
    busDetail: "ಬಸ್ ವಿವರ",
    operator: "ಆಪರೇಟರ್",
    admin: "ಅಡ್ಮಿನ್",
    currentStop: "ಪ್ರಸ್ತುತ ನಿಲ್ದಾಣ",
    payNow: "UPI ಮೂಲಕ ಪಾವತಿಸಿ",
    complaint: "ದೂರು / ಪ್ರತಿಕ್ರಿಯೆ",
    liveStatus: "ಲೈವ್ ಗುಂಪಿನ ಸ್ಥಿತಿ",
    // ── Landing page ──
    corridorSubtitle: "ಮಂಗಳೂರಿನಿಂದ ಉಡುಪಿಗೆ ಖಾಸಗಿ ಬಸ್ ಕಾರಿಡಾರ್ ಬೆಂಬಲ",
    heroMvpLabel: "ಬಸ್‌ಲಿಂಕ್ ಕಾರಿಡಾರ್ MVP",
    heroDesc:
      "ತಕ್ಷಣ ಬಸ್ ಹುಡುಕಿ, ನಿಲ್ದಾಣದಲ್ಲಿ QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ, ನಿಖರ ದರ ತಿಳಿದು, ಮೊಬೈಲ್-ಸ್ನೇಹಿ ಅನುಭವದಿಂದ ಸುರಕ್ಷಿತವಾಗಿ ಪಾವತಿಸಿ.",
    stat1: "ಪ್ರಯಾಣಿಕರು ದರ ಮೋಸ ಅಥವಾ ಅಧಿಕ ಶುಲ್ಕ ವರದಿ ಮಾಡಿದ್ದಾರೆ",
    stat2: "ಈ ಕಾರಿಡಾರ್‌ನಲ್ಲಿ ಅಧಿಕೃತ ಡಿಜಿಟಲ್ ಮಾರ್ಗ ಮಾಹಿತಿ ಸಾಧನಗಳು",
    stat3: "ದೂರುಗಳು ಎಂದಿಗೂ ನೋಂದಾಯಿಸಲ್ಪಡುವುದಿಲ್ಲ ಎಂದು ಪ್ರಯಾಣಿಕರು ಹೇಳುತ್ತಾರೆ",
    feat1: "ದರ ಮತ್ತು ಆಸನ ದೃಶ್ಯಮಾನತೆಯೊಂದಿಗೆ ಮಾರ್ಗ ಹುಡುಕಾಟ",
    feat2: "2 ಟ್ಯಾಪ್‌ಗಳಲ್ಲಿ UPI ಪಾವತಿ ಪ್ರಯಾಣ",
    feat3: "ಬಸ್ ಸಂಖ್ಯೆಗೆ ಸಂಯೋಜಿತ ದೂರು ದಾಖಲಾತಿ",
    liveNow: "ಈಗ ಓಡುತ್ತಿರುವ ಬಸ್‌ಗಳು",
    track: "ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
  },
  tcy: {
    // ── Brand & nav ── (Tulu in Kannada script — Google Translate verified)
    brand: "ಬಸ್‌ಲಿಂಕ್",
    tagline: "ಸ್ಕ್ಯಾನ್ ಮಲ್ಪುಲೆ. ತೆರಿಯುಲೆ. ಪಾವತಿ ಮಲ್ಪುಲೆ. ಪ್ರಯಾಣ ಮಲ್ಪುಲೆ.",
    searchRoute: "ಮಾರ್ಗ ಸರ್ಚ್ ಮಲ್ಪುಲೆ",
    scanQr: "QR ಸ್ಕ್ಯಾನ್ ಮಲ್ಪುಲೆ",
    routeSearch: "ಮಾರ್ಗ ಸರ್ಚ್",
    busDetail: "ಬಸ್ ವಿವರ",
    operator: "ಆಪರೇಟರ್",
    admin: "ಅಡ್ಮಿನ್",
    currentStop: "ಇಪ್ಪಿನ ನಿಲ್ದಾಣ",
    payNow: "UPI ಮೂಲಕ ಪಾವತಿ ಮಲ್ಪುಲೆ",
    complaint: "ದೂರು / ಪ್ರತಿಕ್ರಿಯೆ",
    liveStatus: "ಲೈವ್ ಸ್ಥಿತಿ",
    // ── Landing page ──
    corridorSubtitle: "ಮಂಗಳೂರು ↔ ಉಡುಪಿ ಖಾಸಗಿ ಬಸ್ ಕಾರಿಡಾರ್ ಬೆಂಬಲ",
    heroMvpLabel: "ಬಸ್‌ಲಿಂಕ್ ಕಾರಿಡಾರ್ MVP",
    heroDesc:
      "ಬಸ್ ತಿಕ್ಕ ಸರ್ಚ್ ಮಲ್ಪುಲೆ, ನಿಲ್ದಾಣೊಡು QR ಸ್ಕ್ಯಾನ್ ಮಲ್ಪುಲೆ, ನಿಖರ ದರ ತೆರಿಯುಲೆ, ಸುರಕ್ಷಿತ ಪಾವತಿ ಮಲ್ಪುಲೆ.",
    stat1: "ಪ್ರಯಾಣಿಕೆರ್ ದರ ಜಾಸ್ತಿ ಶುಲ್ಕ ಪಾಡ್ದ್ ವರದಿ ಮಲ್ತೆರ್",
    stat2: "ಡಿಜಿಟಲ್ ಮಾರ್ಗ ಮಾಹಿತಿ ಸಾಧನೊಲು ಇಜ್ಜಿ",
    stat3: "ದೂರುಲೆನ್ ಏಪಲಾ ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಜೆರ್ ಂದ್ ಪ್ರಯಾಣಿಕೆರ್ ಪನ್ಪೆರ್",
    feat1: "ದರ ಬೊಕ್ಕ ಸೀಟ್ ಮಾಹಿತಿಡ್ ಮಾರ್ಗ ಸರ್ಚ್",
    feat2: "2 ಟ್ಯಾಪ್‌ಡ್ UPI ಪಾವತಿ",
    feat3: "ಬಸ್ ನಂಬರ್‌ಗ್ ಲಿಂಕ್ ಆಯಿನ ದೂರು ಲಾಗಿಂಗ್",
    liveNow: "ಈಗ ಓಡ್ದ ಬಸ್‌ಲು",
    track: "ಟ್ರ್ಯಾಕ್ ಮಲ್ಪುಲೆ",
  },
  be: {
    // ── Brand & nav ── (Beary — mix of local Kannada-script words and romanised)
    brand: "BusLink",
    tagline: "Scan maadi. Info nodi. Pay maadi. Travel maadi.",
    searchRoute: "Route search",
    scanQr: "QR scan",
    routeSearch: "Route search",
    busDetail: "Bus detail",
    operator: "Operator",
    admin: "Admin",
    currentStop: "Current stop",
    payNow: "UPI pay",
    complaint: "Complaint / Feedback",
    liveStatus: "Live status",
    // ── Landing page ──
    corridorSubtitle: "Mangalore ↔ Udupi private bus corridor support",
    heroMvpLabel: "BusLink Corridor MVP",
    heroDesc:
      "Bus tidda search maadi, stop-la QR scan maadi, exact fare nodkobaadu, mobile-la secure agi pay maadi.",
    stat1: "Commuters fare mismatch report kaidare",
    stat2: "Inthavar corridor-la official digital route info tools illa",
    stat3: "Complaints note aagilla antha passengers helthare",
    feat1: "Route search with fare and seat info",
    feat2: "2 taps-la UPI payment",
    feat3: "Complaint bus number-gu linked",
    liveNow: "Ippaa odtha iru buses",
    track: "Track maadi",
  },
} as const;

export type TextKey = keyof typeof TEXTS.en;

export const t = (lang: Language, key: TextKey): string =>
  (TEXTS[lang] as Record<string, string>)?.[key] ??
  (TEXTS.en[key] as string) ??
  key;
