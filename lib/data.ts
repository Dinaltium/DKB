import type { Bus, Operator, Stop } from "./types";

export const STOPS: Stop[] = [
  {
    id: "mangalore-central",
    name: "Mangalore Central",
    lat: 12.9141,
    lng: 74.856,
  },
  { id: "hampankatta", name: "Hampankatta", lat: 12.8678, lng: 74.8422 },
  { id: "jyothi", name: "Jyothi", lat: 12.8725, lng: 74.8483 },
  { id: "surathkal", name: "Surathkal", lat: 13.0118, lng: 74.7927 },
  { id: "mulki", name: "Mulki", lat: 13.0908, lng: 74.7875 },
  { id: "padubidri", name: "Padubidri", lat: 13.139905, lng: 74.771194 },
  { id: "brahmavar", name: "Brahmavar", lat: 13.2518, lng: 74.7464 },
  { id: "udupi", name: "Udupi", lat: 13.3420, lng: 74.7470 },
  { id: "manipal", name: "Manipal", lat: 13.3523, lng: 74.786 },
  { id: "karkala", name: "Karkala", lat: 13.214, lng: 74.9923 },
];

const STOP_MAP: Record<string, Stop> = Object.fromEntries(
  STOPS.map((s) => [s.id, s]),
);
const STOP_BY_NAME: Record<string, Stop> = Object.fromEntries(
  STOPS.map((s) => [s.name, s]),
);

export function getStop(idOrName: string): Stop | undefined {
  return STOP_MAP[idOrName] ?? STOP_BY_NAME[idOrName];
}

export function getStopsForRoute(stopIds: string[]): Stop[] {
  return stopIds.map((id) => STOP_MAP[id]).filter(Boolean) as Stop[];
}

export function calcFare(
  fullFare: number,
  fromIdx: number,
  toIdx: number,
  totalStops: number,
): number {
  const steps = Math.abs(toIdx - fromIdx);
  if (steps === 0) return 0;
  return Math.max(5, Math.ceil((steps / (totalStops - 1)) * fullFare));
}

export const OPERATORS: Operator[] = [
  {
    id: "op-coastal",
    name: "Coastal Rider Pvt Ltd",
    email: "coastal@express.com",
    approved: true,
    busIds: ["MNG-101"],
  },
  {
    id: "op-dk",
    name: "DK Connect Lines",
    email: "operator@udupitravel.com",
    approved: true,
    busIds: ["MNG-205"],
  },
  {
    id: "op-new",
    name: "Malpe Mobility",
    email: "malpe@mobility.com",
    approved: false,
    busIds: ["UDU-310"],
  },
];

export const BUSES: Bus[] = [
  {
    id: "MNG-101",
    number: "MNG-101",
    operatorId: "op-coastal",
    licensePlate: "KA-19-AB-1101",
    origin: "Mangalore Central",
    destination: "Udupi",
    routeStopIds: [
      "mangalore-central",
      "hampankatta",
      "jyothi",
      "surathkal",
      "mulki",
      "padubidri",
      "brahmavar",
      "udupi",
    ],
    fullFare: 35,
    driverName: "Raju Shetty",
    conductorName: "Mohan Nayak",
    status: "Running",
    schedule: ["06:00", "08:30", "11:00", "14:00", "17:30", "20:00"],
    statusNote: "Timings are approximate. Delays are common on this corridor.",
    totalSeats: 44,
    occupiedSeats: 21,
    womenReservedTotal: 8,
    womenReservedAvailable: 5,
    studentCardAccepted: true,
    studentDiscountPercent: 30,
    votes: { onTime: 12, slightlyLate: 4, veryLate: 1 },
  },
  {
    id: "MNG-205",
    number: "MNG-205",
    operatorId: "op-dk",
    licensePlate: "KA-19-AC-2205",
    origin: "Mangalore Central",
    destination: "Manipal",
    routeStopIds: [
      "mangalore-central",
      "hampankatta",
      "jyothi",
      "surathkal",
      "mulki",
      "padubidri",
      "udupi",
      "manipal",
    ],
    fullFare: 45,
    driverName: "Suresh Kumar",
    conductorName: "Anand Rao",
    status: "Running",
    schedule: ["07:00", "10:00", "13:00", "16:30", "19:00"],
    statusNote: "Timings are approximate. Delays are common on this corridor.",
    totalSeats: 40,
    occupiedSeats: 14,
    womenReservedTotal: 7,
    womenReservedAvailable: 6,
    studentCardAccepted: true,
    studentDiscountPercent: 25,
    votes: { onTime: 8, slightlyLate: 6, veryLate: 2 },
  },
  {
    id: "UDU-310",
    number: "UDU-310",
    operatorId: "op-new",
    licensePlate: "KA-20-BD-3310",
    origin: "Udupi",
    destination: "Mangalore Central",
    routeStopIds: ["udupi", "padubidri", "hampankatta", "mangalore-central"],
    fullFare: 40,
    driverName: "Prakash Gowda",
    conductorName: "Vivek Nayak",
    status: "Delayed",
    schedule: ["08:00", "12:00", "16:00", "20:00"],
    statusNote: "Express service with limited stops. Timings are approximate.",
    totalSeats: 46,
    occupiedSeats: 18,
    womenReservedTotal: 9,
    womenReservedAvailable: 7,
    studentCardAccepted: false,
    studentDiscountPercent: 0,
    votes: { onTime: 3, slightlyLate: 7, veryLate: 5 },
  },
];

export const OPERATOR_MAP: Record<string, Operator> = Object.fromEntries(
  OPERATORS.map((o) => [o.id, o]),
);

export const BUS_MAP: Record<string, Bus> = Object.fromEntries(
  BUSES.map((b) => [b.id, b]),
);

export const ADMIN_CREDS = { email: "admin@buslink.in", password: "admin123" };

export const OPERATOR_CREDS: Record<
  string,
  { password: string; operatorId: string }
> = {
  "coastal@express.com": { password: "demo123", operatorId: "op-coastal" },
  "operator@udupitravel.com": { password: "demo123", operatorId: "op-dk" },
  "malpe@mobility.com": { password: "demo123", operatorId: "op-new" },
};
