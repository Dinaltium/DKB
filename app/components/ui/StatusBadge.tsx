// app/components/ui/StatusBadge.tsx
// Reusable status badge — single source of truth for all status colours.

type BusStatus        = "Running" | "Not Running" | "Delayed";
type ComplaintStatus  = "pending" | "resolved";
type PaymentStatus    = "success" | "failed" | "pending";
type BusRequestStatus = "pending" | "approved" | "rejected";

export type BadgeStatus = BusStatus | ComplaintStatus | PaymentStatus | BusRequestStatus;

const STYLES: Record<string, React.CSSProperties> = {
  // Bus
  Running: {
    background:  "var(--status-running-bg)",
    color:       "var(--status-running-text)",
    borderColor: "var(--status-running-border)",
  },
  "Not Running": {
    background:  "var(--status-stopped-bg)",
    color:       "var(--status-stopped-text)",
    borderColor: "var(--status-stopped-border)",
  },
  Delayed: {
    background:  "var(--status-delayed-bg)",
    color:       "var(--status-delayed-text)",
    borderColor: "var(--status-delayed-border)",
  },
  // Complaint
  pending: {
    background:  "var(--status-delayed-bg)",
    color:       "var(--status-delayed-text)",
    borderColor: "var(--status-delayed-border)",
  },
  resolved: {
    background:  "var(--status-running-bg)",
    color:       "var(--status-running-text)",
    borderColor: "var(--status-running-border)",
  },
  // Payment
  success: {
    background:  "var(--status-running-bg)",
    color:       "var(--status-running-text)",
    borderColor: "var(--status-running-border)",
  },
  failed: {
    background:  "var(--status-stopped-bg)",
    color:       "var(--status-stopped-text)",
    borderColor: "var(--status-stopped-border)",
  },
  // Bus request
  approved: {
    background:  "var(--status-running-bg)",
    color:       "var(--status-running-text)",
    borderColor: "var(--status-running-border)",
  },
  rejected: {
    background:  "var(--status-stopped-bg)",
    color:       "var(--status-stopped-text)",
    borderColor: "var(--status-stopped-border)",
  },
};

const FALLBACK: React.CSSProperties = {
  background:  "var(--bg-surface-2)",
  color:       "var(--text-muted)",
  borderColor: "var(--border-default)",
};

interface StatusBadgeProps {
  status:    BadgeStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STYLES[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={style}
    >
      {status}
    </span>
  );
}
