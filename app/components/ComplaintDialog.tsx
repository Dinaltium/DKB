"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Complaint } from "@/lib/types";

const CATEGORIES = [
  "Overcharging",
  "Wrong Route",
  "Harassment",
  "Reckless Driving",
  "Other",
];

interface ComplaintDialogProps {
  busNumber: string;
  onSuccess?: () => void;
}

export function ComplaintDialog({
  busNumber,
  onSuccess,
}: ComplaintDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Overcharging");
  const [description, setDescription] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [loading, setLoading] = useState(false);

  const submitComplaint = () => {
    if (!description.trim()) {
      toast.error("Please add complaint details");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("buslink_complaints") || "[]",
        ) as Complaint[];
        const newComplaint: Complaint = {
          id: `CMP-${Date.now()}`,
          busNumber,
          busId: busNumber,
          category,
          description,
          photoName: photoName || undefined,
          timestamp: Date.now(),
          status: "pending",
        };
        stored.push(newComplaint);
        localStorage.setItem("buslink_complaints", JSON.stringify(stored));
        toast.success("Complaint submitted successfully");
        setDescription("");
        setPhotoName("");
        setOpen(false);
        onSuccess?.();
      } catch {
        toast.error("Unable to submit complaint");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="open-complaint-dialog-button"
        className="h-12 rounded-none border-2 border-[#0D1B2A] bg-white px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100 active:scale-[0.98]"
      >
        Complaint / Feedback
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-none border-2 border-slate-300 bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2
              className="text-3xl font-extrabold uppercase text-[#0D1B2A]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              data-testid="complaint-dialog-title"
            >
              Raise Complaint
            </h2>
            <p
              className="text-sm text-slate-500"
              data-testid="complaint-dialog-description"
            >
              Bus Number: {busNumber}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-4 rounded-full p-1 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <select
            data-testid="complaint-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full border-2 border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0D1B2A]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <textarea
            data-testid="complaint-description-input"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border-2 border-slate-300 p-3 text-sm outline-none focus:border-[#0D1B2A]"
          />

          <input
            type="file"
            accept="image/*"
            data-testid="complaint-photo-input"
            className="h-11 w-full border-2 border-slate-300 px-2 text-sm"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? "")}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="h-11 border-2 border-slate-300 px-4 text-sm font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            data-testid="complaint-submit-button"
            onClick={submitComplaint}
            disabled={loading}
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </div>
    </>
  );
}
