import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

const statusOptions = ["Running", "Not Running", "Delayed"];

export const OperatorDashboardPage = () => {
  const [operators, setOperators] = useState([]);
  const [operatorId, setOperatorId] = useState("");
  const [dashboard, setDashboard] = useState(null);

  const loadOperators = async () => {
    try {
      const response = await api.get("/operators");
      setOperators(response.data);
      const approved = response.data.find((item) => item.approved);
      if (approved) {
        setOperatorId((prev) => prev || approved.operator_id);
      }
    } catch (error) {
      toast.error("Unable to fetch operators");
    }
  };

  const loadDashboard = async (id) => {
    if (!id) return;
    try {
      const response = await api.get(`/operators/${id}/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      toast.error("Unable to fetch dashboard data");
    }
  };

  const updateStatus = async (busNumber, status) => {
    try {
      await api.put(`/operators/${operatorId}/buses/${busNumber}/status`, { status });
      toast.success("Bus status updated");
      loadDashboard(operatorId);
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    loadDashboard(operatorId);
  }, [operatorId]);

  return (
    <AppShell title="Operator Dashboard" subtitle="No-login quick prototype controls for bus operators">
      <section data-testid="operator-selector-section" className="ticket-stub rounded-lg p-4">
        <Select value={operatorId} onValueChange={setOperatorId}>
          <SelectTrigger data-testid="operator-selector" className="h-11 border-2 border-slate-300 bg-white md:max-w-md">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator.operator_id} value={operator.operator_id} data-testid={`operator-option-${operator.operator_id}`}>
                {operator.name} ({operator.approved ? "Approved" : "Pending"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {dashboard && (
        <>
          <section data-testid="operator-stats-section" className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-slate-300 bg-white">
              <CardHeader>
                <CardTitle className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">Daily Trips</CardTitle>
              </CardHeader>
              <CardContent data-testid="operator-daily-trips-value" className="text-3xl font-bold text-[#0E7C86]">
                {dashboard.stats.daily_trips}
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-300 bg-white">
              <CardHeader>
                <CardTitle className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">Payment Transactions</CardTitle>
              </CardHeader>
              <CardContent data-testid="operator-payment-transactions-value" className="text-3xl font-bold text-[#0E7C86]">
                {dashboard.stats.payment_transactions}
              </CardContent>
            </Card>
          </section>

          <section data-testid="operator-buses-section" className="mt-6 space-y-4">
            {dashboard.buses.map((bus) => (
              <Card key={bus.bus_number} className="border-2 border-slate-300 bg-white">
                <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p data-testid={`operator-bus-number-${bus.bus_number.toLowerCase()}`} className="font-['Barlow_Condensed'] text-4xl font-extrabold text-[#0D1B2A]">
                      {bus.bus_number}
                    </p>
                    <p data-testid={`operator-bus-route-${bus.bus_number.toLowerCase()}`} className="text-sm text-slate-600">
                      {bus.origin} → {bus.destination}
                    </p>
                  </div>

                  <Select
                    defaultValue={bus.status}
                    onValueChange={(value) => updateStatus(bus.bus_number, value)}
                  >
                    <SelectTrigger data-testid={`operator-status-select-${bus.bus_number.toLowerCase()}`} className="h-10 w-[170px] border-2 border-slate-300 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status} data-testid={`operator-status-option-${bus.bus_number.toLowerCase()}-${status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    data-testid={`operator-refresh-bus-${bus.bus_number.toLowerCase()}`}
                    onClick={() => loadDashboard(operatorId)}
                    className="h-10 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                  >
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <section data-testid="operator-complaints-section" className="mt-6 space-y-3">
            {dashboard.complaints.length === 0 && (
              <p data-testid="operator-no-complaints" className="ticket-stub rounded-lg p-4 text-sm text-slate-600">
                No complaints received yet.
              </p>
            )}

            {dashboard.complaints.map((complaint) => (
              <article
                key={complaint.complaint_id}
                data-testid={`operator-complaint-${complaint.complaint_id.toLowerCase()}`}
                className="ticket-stub rounded-lg p-4"
              >
                <p className="text-xs uppercase tracking-wider text-slate-500">{complaint.complaint_id}</p>
                <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">
                  {complaint.bus_number} • {complaint.category}
                </p>
                <p className="mt-1 text-sm text-slate-700">{complaint.description}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
};
