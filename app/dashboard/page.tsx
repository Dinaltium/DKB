import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import {
  getAllBusesWithRouteIds,
  getAllComplaints,
  getAllOperators,
  getAllBusRequests,
  getAllPayments,
  getAllStops,
  getBusesForOperator,
  getComplaintsForOperator,
  getBusRequestsByOperator,
  getOperatorByUserId,
  getPaymentsForUser,
  getTravelHistoryForUser,
  getLoyaltyAccount,
} from "@/lib/db/queries";
import { PassengerDashboard } from "./PassengerDashboard";
import { OperatorDashboard } from "./OperatorDashboard";
import { AdminDashboard } from "./AdminDashboard";

export default async function DashboardPage() {
  const session = await auth();

  // Not logged in — send to auth page
  if (!session) redirect("/auth?callbackUrl=/dashboard");

  const role   = session.user.role;
  const userId = session.user.id;

  // ── Passenger ──────────────────────────────────────────────────────────────
  if (role === "passenger") {
    const [travelHistory, loyalty, payments] = await Promise.all([
      getTravelHistoryForUser(userId),
      getLoyaltyAccount(userId),
      getPaymentsForUser(userId),
    ]);

    return (
      <AppShell
        title="My Dashboard"
        subtitle={`Welcome back, ${session.user.name ?? session.user.email}`}
      >
        <PassengerDashboard
          travelHistory={travelHistory}
          loyalty={loyalty ?? null}
          payments={payments}
          user={session.user}
        />
      </AppShell>
    );
  }

  // ── Operator ───────────────────────────────────────────────────────────────
  if (role === "operator") {
    const op = await getOperatorByUserId(userId);
    if (!op) redirect("/?error=operator_not_found");

    // Only show if approved
    if (!op.approved) {
      return (
        <AppShell title="Dashboard" subtitle="Pending approval">
          <div
            className="ticket-stub rounded-none border-2 border-foreground p-8 text-center shadow-[4px_4px_0_hsl(var(--foreground))]"
            style={{ color: "var(--text-secondary)" }}
          >
            <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>
              Account Pending
            </p>
            <p className="mt-2 text-sm">
              Your operator account is awaiting admin approval. You will be
              notified once it is approved.
            </p>
          </div>
        </AppShell>
      );
    }

    const [opBuses, opComplaints, payments, operatorBusRequests, stops] = await Promise.all([
      getBusesForOperator(op.id),
      getComplaintsForOperator(op.id),
      getPaymentsForUser(userId),
      getBusRequestsByOperator(op.id),
      getAllStops(),
    ]);

    return (
      <AppShell
        title="Operator Dashboard"
        subtitle={op.companyName}
      >
        <OperatorDashboard
          operator={op}
          buses={opBuses}
          complaints={opComplaints}
          payments={payments}
          busRequests={operatorBusRequests}
          stops={stops}
        />
      </AppShell>
    );
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (role === "admin") {
    const [allBuses, allOperators, allComplaints, allBusRequests, allStops, allPayments] =
      await Promise.all([
        getAllBusesWithRouteIds(),
        getAllOperators(),
        getAllComplaints(),
        getAllBusRequests(),
        getAllStops(),
        getAllPayments(),
      ]);

    return (
      <AppShell
        title="Admin Panel"
        subtitle="Full platform overview"
      >
        <AdminDashboard
          buses={allBuses}
          operators={allOperators}
          complaints={allComplaints}
          busRequests={allBusRequests}
          stops={allStops}
          payments={allPayments}
        />
      </AppShell>
    );
  }

  redirect("/");
}