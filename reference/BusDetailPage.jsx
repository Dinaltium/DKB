import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Clock4, QrCode, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { AppShell } from "@/components/AppShell";
import { BusMap } from "@/components/BusMap";
import { ComplaintDialog } from "@/components/ComplaintDialog";
import { PaymentDrawer } from "@/components/PaymentDrawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const voteItems = [
  { key: "on_time", label: "On Time" },
  { key: "slightly_late", label: "Slightly Late" },
  { key: "very_late", label: "Very Late" },
];

const statusColors = {
  Running: "text-emerald-700 bg-emerald-50 border-emerald-300",
  "Not Running": "text-rose-700 bg-rose-50 border-rose-300",
  Delayed: "text-amber-700 bg-amber-50 border-amber-300",
};

export const BusDetailPage = () => {
  const { busNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentStop = searchParams.get("currentStop") || "Mangalore Central";

  const loadBus = async () => {
    try {
      const response = await api.get(`/buses/${busNumber}`, {
        params: { current_stop: currentStop },
      });
      setBus(response.data);
    } catch (error) {
      toast.error("Unable to load bus details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busNumber, currentStop]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadBus();
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busNumber, currentStop]);

  const qrValue = useMemo(() => {
    if (!bus) return "";
    return `${window.location.origin}/bus/${bus.bus_number}`;
  }, [bus]);

  const vote = async (voteKey) => {
    try {
      const response = await api.post(`/buses/${busNumber}/crowd-vote`, { status: voteKey });
      setBus((prev) => ({ ...prev, crowd_votes: response.data }));
      toast.success("Thanks for your live update");
    } catch (error) {
      toast.error("Unable to submit vote");
    }
  };

  if (loading) {
    return (
      <AppShell title="Loading bus..." subtitle="Fetching real-time details">
        <div data-testid="bus-detail-loading-state" className="ticket-stub rounded-lg p-6 text-sm text-slate-600">
          Please wait while BusConnect loads this QR-linked bus page.
        </div>
      </AppShell>
    );
  }

  if (!bus) {
    return (
      <AppShell title="Bus not found" subtitle="Please check QR link">
        <div data-testid="bus-detail-not-found-state" className="ticket-stub rounded-lg p-6 text-sm text-rose-600">
          The bus you requested is not available.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Bus ${bus.bus_number}`} subtitle="QR landing page for live route, fare and payments">
      <section data-testid="bus-detail-hero-grid" className="grid gap-4 md:grid-cols-2">
        <Card className="ticket-stub border-2 border-slate-300 bg-white">
          <CardHeader className="pb-3">
            <CardTitle data-testid="bus-detail-main-info-title" className="font-['Barlow_Condensed'] text-4xl uppercase text-[#0D1B2A]">
              {bus.bus_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p data-testid="bus-detail-license-plate">License: {bus.license_plate}</p>
            <p data-testid="bus-detail-driver-name">Driver: {bus.driver_name}</p>
            <p data-testid="bus-detail-conductor-name">Conductor: {bus.conductor_name}</p>
            <p data-testid="bus-detail-route">Route: {bus.origin} → {bus.destination}</p>
            <p data-testid="bus-detail-current-stop">Current stop context: {currentStop}</p>
            <div
              data-testid="bus-detail-operational-status"
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[bus.status]}`}
            >
              {bus.status}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white">
          <CardHeader className="pb-3">
            <CardTitle data-testid="bus-detail-schedule-title" className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">
              Schedule & Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div data-testid="bus-detail-schedule-list" className="flex flex-wrap gap-2">
              {bus.schedule.map((slot) => (
                <span key={slot} className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs">
                  {slot}
                </span>
              ))}
            </div>
            <p data-testid="bus-detail-disclaimer" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              {bus.status_note}
            </p>
            <p data-testid="bus-detail-student-card" className="text-sm text-slate-700">
              Student BusChalo Card: {bus.student_card_accepted ? "Accepted" : "Not Accepted"}
              {bus.student_card_accepted ? ` • Discount ${bus.student_discount_percent}%` : ""}
            </p>
          </CardContent>
        </Card>
      </section>

      <section data-testid="bus-detail-map-section" className="mt-6">
        <BusMap stops={bus.route_stops} />
      </section>

      <section data-testid="bus-detail-fare-votes-grid" className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-slate-300 bg-white">
          <CardHeader className="pb-3">
            <CardTitle data-testid="fare-table-title" className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">
              Fare from {currentStop}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bus.fare_table.map((row) => (
              <div
                key={row.stop}
                data-testid={`fare-table-row-${row.stop.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span>{row.stop}</span>
                <span className="font-semibold text-[#0E7C86]">₹{row.fare}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white">
          <CardHeader className="pb-3">
            <CardTitle data-testid="crowd-vote-title" className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">
              Live Crowd Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {voteItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div
                  data-testid={`crowd-vote-count-${item.key}`}
                  className="text-sm text-slate-700"
                >
                  {item.label}: <strong>{bus.crowd_votes[item.key]}</strong>
                </div>
                <Button
                  onClick={() => vote(item.key)}
                  data-testid={`crowd-vote-button-${item.key}`}
                  className="h-9 rounded-none border-2 border-[#0D1B2A] bg-white px-3 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100"
                >
                  Vote
                </Button>
              </div>
            ))}

            <div data-testid="women-reserved-seat-info" className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
              Women Reserved Seats: {bus.women_reserved_available} / {bus.women_reserved_total}
            </div>

            <div data-testid="available-seats-info" className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
              <Users className="mr-2 inline-block h-4 w-4" />
              Available Seats: {bus.available_seats} / {bus.total_seats}
            </div>
          </CardContent>
        </Card>
      </section>

      <section data-testid="bus-detail-qr-section" className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
        <Card className="border-2 border-slate-300 bg-white">
          <CardContent className="flex flex-col items-center p-4">
            <QrCode className="mb-2 h-5 w-5 text-[#0D1B2A]" />
            <QRCodeSVG value={qrValue} size={170} data-testid="bus-detail-qr-code" />
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white">
          <CardContent className="space-y-3 p-4 text-sm text-slate-700">
            <p data-testid="bus-detail-qr-info-text">Operators can print this QR and place it inside the bus for instant passenger access.</p>
            <p data-testid="bus-detail-operator-info">Operator: {bus.operator_name}</p>
            <p data-testid="bus-detail-full-fare">Full Route Fare: ₹{bus.full_fare}</p>
            <p data-testid="bus-detail-last-updated">
              <Clock4 className="mr-2 inline h-4 w-4" />
              Auto refresh enabled every 15 seconds.
            </p>
          </CardContent>
        </Card>
      </section>

      <div data-testid="bus-detail-sticky-action-bar" className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-white/90 px-4 py-3 backdrop-blur-md md:bottom-4 md:left-auto md:right-4 md:w-auto md:rounded-lg md:border md:border-slate-200">
        <PaymentDrawer busNumber={bus.bus_number} amount={bus.full_fare} onSuccess={loadBus} />
        <ComplaintDialog busNumber={bus.bus_number} onSuccess={loadBus} />
      </div>
    </AppShell>
  );
};
