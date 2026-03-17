export type BusStatus = "Running" | "Not Running" | "Delayed";
export type Language = "en" | "kn" | "tcy" | "be";

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Bus {
  id: string;
  number: string;
  operatorId: string;
  licensePlate: string;
  origin: string;
  destination: string;
  routeStopIds: string[];
  fullFare: number;
  driverName: string;
  conductorName: string;
  routeGeometry?: { lat: number; lng: number }[];
  status: BusStatus;
  schedule: string[];
  statusNote: string;
  totalSeats: number;
  occupiedSeats: number;
  womenReservedTotal: number;
  womenReservedAvailable: number;
  studentCardAccepted: boolean;
  studentDiscountPercent: number;
  votes: { onTime: number; slightlyLate: number; veryLate: number };
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  busIds: string[];
}

export interface Complaint {
  id: string;
  busNumber: string;
  busId: string;
  category: string;
  description: string;
  photoName?: string;
  timestamp: number;
  status: "pending" | "resolved";
}
