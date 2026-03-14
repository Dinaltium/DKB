import { useState } from "react";
import { toast } from "sonner";
import { CircleCheckBig, CircleX, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { api } from "@/lib/api";

export const PaymentDrawer = ({ busNumber, amount, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const processPayment = async () => {
    if (!upiId.trim()) {
      toast.error("Please enter UPI ID");
      return;
    }
    try {
      setLoading(true);
      setReceipt(null);
      const response = await api.post("/payments/mock", {
        bus_number: busNumber,
        amount,
        payer_name: payerName || "Guest User",
        upi_id: upiId,
      });
      setReceipt(response.data);
      if (response.data.status === "success") {
        toast.success("Payment completed successfully");
        onSuccess?.(response.data);
      } else {
        toast.error("Payment failed. Please retry.");
      }
    } catch (error) {
      toast.error("Unable to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          data-testid="open-payment-drawer-button"
          className="h-12 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
        >
          Pay via UPI
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto w-full max-w-xl border-2 border-slate-300 bg-white">
        <DrawerHeader>
          <DrawerTitle data-testid="payment-drawer-title" className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">
            Mock RazorPay Checkout
          </DrawerTitle>
          <DrawerDescription data-testid="payment-drawer-description">
            Bus {busNumber} • Pay ₹{amount}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-3">
          <Input
            data-testid="payment-payer-name-input"
            placeholder="Your name"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="h-11 border-2 border-slate-300"
          />
          <Input
            data-testid="payment-upi-id-input"
            placeholder="UPI ID (example@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="h-11 border-2 border-slate-300"
          />

          {receipt && (
            <div
              data-testid="payment-result-card"
              className={`ticket-stub rounded-lg p-4 text-sm ${
                receipt.status === "success" ? "border-emerald-500" : "border-rose-500"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {receipt.status === "success" ? (
                  <CircleCheckBig className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CircleX className="h-5 w-5 text-rose-600" />
                )}
                <span data-testid="payment-result-status">
                  {receipt.status === "success" ? "Payment Successful" : "Payment Failed"}
                </span>
              </div>
              <p data-testid="payment-result-transaction-id" className="mt-2 font-mono text-xs text-slate-700">
                Transaction: {receipt.transaction_id}
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={processPayment}
            disabled={loading}
            data-testid="payment-submit-button"
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] font-semibold uppercase tracking-wider text-white hover:bg-slate-800"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ₹${amount}`
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
