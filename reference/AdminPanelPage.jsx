import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export const AdminPanelPage = () => {
  const [overview, setOverview] = useState(null);

  const loadOverview = async () => {
    try {
      const response = await api.get("/admin/overview");
      setOverview(response.data);
    } catch (error) {
      toast.error("Unable to load admin overview");
    }
  };

  const updateOperator = async (operatorId, approved) => {
    try {
      await api.patch(`/admin/operators/${operatorId}`, { approved });
      toast.success(`Operator ${approved ? "approved" : "rejected"}`);
      loadOverview();
    } catch (error) {
      toast.error("Unable to update operator status");
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <AppShell title="Admin Panel" subtitle="Minimal controls to review buses, operators and complaints">
      {!overview && (
        <div data-testid="admin-loading-state" className="ticket-stub rounded-lg p-5 text-sm text-slate-600">
          Loading admin data...
        </div>
      )}

      {overview && (
        <>
          <section data-testid="admin-summary-cards" className="grid gap-4 md:grid-cols-3">
            <Card className="border-2 border-slate-300 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">Buses</CardTitle>
              </CardHeader>
              <CardContent data-testid="admin-total-buses" className="text-4xl font-bold text-[#0E7C86]">
                {overview.buses.length}
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-300 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">Operators</CardTitle>
              </CardHeader>
              <CardContent data-testid="admin-total-operators" className="text-4xl font-bold text-[#0E7C86]">
                {overview.operators.length}
              </CardContent>
            </Card>
            <Card className="border-2 border-slate-300 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="font-['Barlow_Condensed'] text-3xl uppercase text-[#0D1B2A]">Complaints</CardTitle>
              </CardHeader>
              <CardContent data-testid="admin-total-complaints" className="text-4xl font-bold text-[#0E7C86]">
                {overview.complaints.length}
              </CardContent>
            </Card>
          </section>

          <section data-testid="admin-operators-section" className="mt-6 space-y-3">
            {overview.operators.map((operator) => (
              <article
                key={operator.operator_id}
                data-testid={`admin-operator-row-${operator.operator_id}`}
                className="ticket-stub rounded-lg p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2A]" data-testid={`admin-operator-name-${operator.operator_id}`}>
                      {operator.name}
                    </p>
                    <p className="text-xs text-slate-600" data-testid={`admin-operator-status-${operator.operator_id}`}>
                      {operator.approved ? "Approved" : "Pending"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid={`admin-approve-operator-${operator.operator_id}`}
                      onClick={() => updateOperator(operator.operator_id, true)}
                      className="h-9 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      data-testid={`admin-reject-operator-${operator.operator_id}`}
                      onClick={() => updateOperator(operator.operator_id, false)}
                      className="h-9 rounded-none border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-700"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section data-testid="admin-buses-section" className="mt-6 space-y-3">
            {overview.buses.map((bus) => (
              <article
                key={bus.bus_number}
                data-testid={`admin-bus-row-${bus.bus_number.toLowerCase()}`}
                className="rounded-lg border-2 border-slate-200 bg-white p-4"
              >
                <p className="font-['Barlow_Condensed'] text-3xl font-extrabold text-[#0D1B2A]" data-testid={`admin-bus-number-${bus.bus_number.toLowerCase()}`}>
                  {bus.bus_number}
                </p>
                <p className="text-sm text-slate-600" data-testid={`admin-bus-route-${bus.bus_number.toLowerCase()}`}>
                  {bus.origin} → {bus.destination}
                </p>
                <p className="text-sm text-slate-700" data-testid={`admin-bus-status-${bus.bus_number.toLowerCase()}`}>
                  Status: {bus.status}
                </p>
              </article>
            ))}
          </section>

          <section data-testid="admin-complaints-section" className="mt-6 space-y-3">
            {overview.complaints.map((complaint) => (
              <article
                key={complaint.complaint_id}
                data-testid={`admin-complaint-row-${complaint.complaint_id.toLowerCase()}`}
                className="rounded-lg border-2 border-slate-200 bg-white p-4"
              >
                <p className="text-xs uppercase tracking-wider text-slate-500" data-testid={`admin-complaint-id-${complaint.complaint_id.toLowerCase()}`}>
                  {complaint.complaint_id}
                </p>
                <p className="text-sm font-semibold text-[#0D1B2A]" data-testid={`admin-complaint-category-${complaint.complaint_id.toLowerCase()}`}>
                  {complaint.bus_number} • {complaint.category}
                </p>
                <p className="text-sm text-slate-700" data-testid={`admin-complaint-description-${complaint.complaint_id.toLowerCase()}`}>
                  {complaint.description}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
};
