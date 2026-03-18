"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitComplaintAction } from "@/lib/actions/bus";

const CATEGORIES = ["Overcharging", "Wrong Route", "Harassment", "Reckless Driving", "Other"];

interface ComplaintDialogProps {
  busId:     string;
  busNumber: string;
  onSuccess?: () => void;
}

export function ComplaintDialog({ busId, busNumber, onSuccess }: ComplaintDialogProps) {
  const [open, setOpen]           = useState(false);
  const [category, setCategory]   = useState("Overcharging");
  const [description, setDescription] = useState("");
  const [isPending, startTransition]  = useTransition();

  const handleSubmit = () => {
    if (!description.trim()) { toast.error("Please add complaint details"); return; }

    startTransition(async () => {
      const result = await submitComplaintAction({
        busId,
        busNumber,
        category,
        description,
      });

      if (result.success) {
        toast.success("Complaint submitted successfully");
        setDescription("");
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error("Unable to submit complaint. Please try again.");
      }
    });
  };

  const inputStyle = {
    background:  "var(--input-bg)",
    borderColor: "var(--input-border)",
    color:       "var(--input-text)",
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="open-complaint-dialog-button"
        className="h-12 rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide hover:opacity-80 active:scale-[0.98]"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
      >
        Complaint / Feedback
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-none border-2 p-6 shadow-2xl"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-medium)" }}
      >
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2
              className="text-3xl font-extrabold uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
              data-testid="complaint-dialog-title"
            >
              Raise Complaint
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }} data-testid="complaint-dialog-description">
              Bus {busNumber}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-4 rounded-full p-1 hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <select
            data-testid="complaint-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full border-2 px-3 text-sm outline-none"
            style={inputStyle}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <textarea
            data-testid="complaint-description-input"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border-2 p-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="h-11 border-2 px-4 text-sm font-semibold uppercase tracking-wide hover:opacity-80"
            style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)", background: "transparent" }}
          >
            Cancel
          </button>
          <button
            data-testid="complaint-submit-button"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </div>
    </>
  );
}