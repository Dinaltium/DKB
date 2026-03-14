"use client";

import { useState } from "react";
import { CircleCheckBig, CircleX, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

interface PaymentDrawerProps {
  busNumber: string;
  amount: number;
  onSuccess?: () => void;
}

interface Receipt {
  status: "success" | "failed";
  transactionId: string;
}

export function PaymentDrawer({
  busNumber,
  amount,
  onSuccess,
}: PaymentDrawerProps) {
  const [open, setOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const processPayment = () => {
    if (!upiId.trim()) {
      toast.error("Please enter your UPI ID");
      return;
    }

    setLoading(true);
    setReceipt(null);

    setTimeout(() => {
      const success = Math.random() >= 0.2;
      const transactionId = "TXN" + Date.now();
      const result: Receipt = {
        status: success ? "success" : "failed",
        transactionId,
      };
      setReceipt(result);

      if (success) {
        toast.success("Payment completed successfully");
        try {
          const payments = JSON.parse(
            localStorage.getItem("buslink_payments") || "[]",
          ) as unknown[];
          payments.push({
            busNumber,
            amount,
            transactionId,
            timestamp: Date.now(),
          });
          localStorage.setItem("buslink_payments", JSON.stringify(payments));
        } catch {}
        onSuccess?.();
      } else {
        toast.error("Payment failed. Please retry.");
      }
      setLoading(false);
    }, 1500);
  };

  const reset = () => {
    setReceipt(null);
    setUpiId("");
    setPayerName("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="open-payment-drawer-button"
        className="h-12 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400 active:scale-[0.98]"
      >
        Pay via UPI
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => {
          setOpen(false);
          reset();
        }}
      />

      {/* Bottom drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl rounded-t-2xl border-2 border-slate-300 bg-white px-4 pb-8 pt-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2
            className="text-3xl font-extrabold uppercase text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="payment-drawer-title"
          >
            Mock RazorPay Checkout
          </h2>
          <button
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="rounded-full p-1 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <p
          className="mb-4 text-sm text-slate-500"
          data-testid="payment-drawer-description"
        >
          Bus {busNumber} &bull; Pay ₹{amount}
        </p>

        <div className="space-y-3">
          <input
            data-testid="payment-payer-name-input"
            type="text"
            placeholder="Your name"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="h-11 w-full border-2 border-slate-300 px-3 text-sm outline-none focus:border-[#0D1B2A]"
          />
          <input
            data-testid="payment-upi-id-input"
            type="text"
            placeholder="UPI ID (example@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="h-11 w-full border-2 border-slate-300 px-3 text-sm outline-none focus:border-[#0D1B2A]"
          />

          {receipt && (
            <div
              data-testid="payment-result-card"
              className={`ticket-stub rounded-lg p-4 text-sm ${
                receipt.status === "success"
                  ? "border-emerald-500"
                  : "border-rose-500"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {receipt.status === "success" ? (
                  <CircleCheckBig className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CircleX className="h-5 w-5 text-rose-600" />
                )}
                <span data-testid="payment-result-status">
                  {receipt.status === "success"
                    ? "Payment Successful"
                    : "Payment Failed"}
                </span>
              </div>
              <p
                data-testid="payment-result-transaction-id"
                className="mt-2 font-mono text-xs text-slate-700"
              >
                Transaction: {receipt.transactionId}
              </p>
            </div>
          )}

          <button
            onClick={processPayment}
            disabled={loading}
            data-testid="payment-submit-button"
            className="mt-1 h-11 w-full rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] font-semibold uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ₹${amount}`
            )}
          </button>
        </div>
      </div>
    </>
  );
}
