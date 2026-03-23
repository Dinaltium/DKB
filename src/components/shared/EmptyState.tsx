// app/components/ui/EmptyState.tsx
// Reusable empty-state placeholder shown whenever a list or section has no data.

interface EmptyStateProps {
  title?: string;
  description?: string;
  /** Optional call-to-action — pass a <Link> or <button> */
  action?: React.ReactNode;
  /** Override the default bus illustration */
  icon?: React.ReactNode;
}

function BusIllustration() {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-20 w-32"
      aria-hidden="true"
    >
      {/* Road */}
      <rect x="0" y="62" width="120" height="4" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="8"  y="63" width="14" height="2" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="53" y="63" width="14" height="2" rx="1" fill="currentColor" opacity="0.25" />
      <rect x="98" y="63" width="14" height="2" rx="1" fill="currentColor" opacity="0.25" />

      {/* Bus body */}
      <rect x="18" y="26" width="84" height="36" rx="5" fill="currentColor" opacity="0.10" />
      <rect x="18" y="26" width="84" height="36" rx="5" stroke="currentColor" strokeWidth="2" opacity="0.35" />

      {/* Destination board on roof */}
      <rect x="26" y="18" width="68" height="10" rx="3" fill="currentColor" opacity="0.16" />
      <rect x="26" y="18" width="68" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.30" />
      <rect x="32" y="21" width="22" height="2" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="32" y="24" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.20" />

      {/* Windows */}
      <rect x="25" y="31" width="14" height="10" rx="2" fill="currentColor" opacity="0.22" />
      <rect x="45" y="31" width="14" height="10" rx="2" fill="currentColor" opacity="0.22" />
      <rect x="65" y="31" width="14" height="10" rx="2" fill="currentColor" opacity="0.22" />
      <rect x="85" y="31" width="14" height="10" rx="2" fill="currentColor" opacity="0.22" />

      {/* Door */}
      <rect x="25" y="46" width="14" height="14" rx="1" fill="currentColor" opacity="0.18" />
      <rect x="25" y="46" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.28" />
      <line x1="32" y1="46" x2="32" y2="60" stroke="currentColor" strokeWidth="0.75" opacity="0.22" />

      {/* Wheels */}
      <circle cx="37"  cy="64" r="6.5" fill="currentColor" opacity="0.28" />
      <circle cx="37"  cy="64" r="3.5" fill="currentColor" opacity="0.12" />
      <circle cx="83"  cy="64" r="6.5" fill="currentColor" opacity="0.28" />
      <circle cx="83"  cy="64" r="3.5" fill="currentColor" opacity="0.12" />

      {/* Headlight */}
      <rect x="98" y="35" width="4" height="6" rx="1" fill="currentColor" opacity="0.30" />

      {/* No-data slash overlay */}
      <line x1="30" y1="18" x2="90" y2="66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.18" />
    </svg>
  );
}

export function EmptyState({
  title = "No details available",
  description = "There is nothing to display here yet.",
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-none border-2 border-dashed px-6 py-14 text-center shadow-[4px_4px_0_hsl(var(--foreground))]"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-surface)",
      }}
    >
      <div className="mb-5" style={{ color: "var(--text-muted)" }}>
        {icon ?? <BusIllustration />}
      </div>

      <p
        className="text-xl font-black uppercase tracking-wide"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "var(--text-secondary)",
        }}
      >
        {title}
      </p>

      <p
        className="mt-2 max-w-xs text-sm leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
