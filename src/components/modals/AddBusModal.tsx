"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StopBuilder } from "@/components/shared/StopBuilder";
import { ModalFrame } from "@/components/modals/ModalFrame";
import type { Operator, Stop } from "@/lib/db/schema";

export interface OperatorRow {
  operator: Operator;
  user: {
    name: string | null;
    email: string | null;
    mustChangePassword: boolean;
    passwordExpiresAt: Date | null;
    createdAt: Date;
  };
}

export function AddBusModal({
  operators,
  stops,
  onClose,
  onSubmit,
  isPending,
}: {
  operators: OperatorRow[];
  stops: Stop[];
  onClose: () => void;
  onSubmit: (data: {
    number: string;
    operatorId: string;
    licensePlate: string;
    origin: string;
    destination: string;
    fullFare: number;
    driverName: string;
    conductorName: string;
    totalSeats: number;
    schedule: string[];
    womenReservedTotal: number;
    studentCardAccepted: boolean;
    studentDiscountPercent: number;
    routeStopIds: string[];
  }) => void;
  isPending: boolean;
}) {
  const [number, setNumber] = useState("");
  const [operatorId, setOperatorId] = useState(operators[0]?.operator.id ?? "");
  const [licensePlate, setLicensePlate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fullFare, setFullFare] = useState("");
  const [driverName, setDriverName] = useState("");
  const [conductorName, setConductorName] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [womenReservedTotal, setWomenReservedTotal] = useState("0");
  const [studentCardAccepted, setStudentCardAccepted] = useState(false);
  const [studentDiscountPercent, setStudentDiscountPercent] = useState("0");
  const [scheduleRaw, setScheduleRaw] = useState("");
  const [routeStopIds, setRouteStopIds] = useState<string[]>([]);

  return (
    <ModalFrame title="Add bus" onClose={onClose}>
      <form
        className="grid gap-2 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            number,
            operatorId,
            licensePlate,
            origin,
            destination,
            fullFare: Number(fullFare),
            driverName,
            conductorName,
            totalSeats: Number(totalSeats),
            schedule: scheduleRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            womenReservedTotal: Number(womenReservedTotal),
            studentCardAccepted,
            studentDiscountPercent: Number(studentDiscountPercent),
            routeStopIds,
          });
        }}
      >
        <Input
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Bus Number"
          className="rounded-none border-2 border-foreground"
        />
        <select
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          className="h-10 rounded-none border-2 border-foreground bg-background px-2 text-sm"
        >
          {operators.map(({ operator }) => (
            <option key={operator.id} value={operator.id}>
              {operator.companyName}
            </option>
          ))}
        </select>
        <Input
          required
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value)}
          placeholder="License Plate"
          className="md:col-span-2 rounded-none border-2 border-foreground"
        />
        <Input
          required
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          required
          type="number"
          value={fullFare}
          onChange={(e) => setFullFare(e.target.value)}
          placeholder="Full Fare"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          required
          type="number"
          value={totalSeats}
          onChange={(e) => setTotalSeats(e.target.value)}
          placeholder="Total Seats"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          required
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          placeholder="Driver Name"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          required
          value={conductorName}
          onChange={(e) => setConductorName(e.target.value)}
          placeholder="Conductor Name"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          value={womenReservedTotal}
          onChange={(e) => setWomenReservedTotal(e.target.value)}
          type="number"
          placeholder="Women Reserved Seats"
          className="rounded-none border-2 border-foreground"
        />
        <Input
          value={studentDiscountPercent}
          onChange={(e) => setStudentDiscountPercent(e.target.value)}
          type="number"
          placeholder="Student Discount %"
          className="rounded-none border-2 border-foreground"
        />
        <label className="flex items-center gap-2 text-xs md:col-span-2">
          <input
            type="checkbox"
            checked={studentCardAccepted}
            onChange={(e) => setStudentCardAccepted(e.target.checked)}
          />
          Student card accepted
        </label>
        <Input
          value={scheduleRaw}
          onChange={(e) => setScheduleRaw(e.target.value)}
          placeholder="Schedule comma-separated"
          className="md:col-span-2 rounded-none border-2 border-foreground"
        />
        <div className="md:col-span-2">
          <StopBuilder
            stops={stops}
            value={routeStopIds}
            onChange={setRouteStopIds}
          />
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
          >
            Add Bus
          </Button>
        </div>
      </form>
    </ModalFrame>
  );
}
