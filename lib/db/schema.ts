import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "passenger",
  "operator",
  "admin",
]);

export const busStatusEnum = pgEnum("bus_status", [
  "Running",
  "Not Running",
  "Delayed",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "pending",
  "resolved",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "success",
  "failed",
  "pending",
]);

export const busRequestStatusEnum = pgEnum("bus_request_status", [
  "pending",
  "approved",
  "rejected",
]);

// ── Auth.js v5 required tables ─────────────────────────────────────────────
// These are the exact column names Auth.js DrizzleAdapter expects.

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // hashed; null for OAuth users
  role: userRoleEnum("role").notNull().default("passenger"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  passwordChangedAt: timestamp("password_changed_at"),
  passwordExpiresAt: timestamp("password_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    // DrizzleAdapter v5 requires these specific snake_case JS property names
    // to match what Auth.js expects internally. The actual DB column names
    // (second argument to text/integer) remain unchanged.
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// ── Operators ─────────────────────────────────────────────────────────────────

export const operators = pgTable("operators", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  phone: text("phone"),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Stops ─────────────────────────────────────────────────────────────────────

export const stops = pgTable("stops", {
  id: text("id").primaryKey(), // slug e.g. "mangalore-central"
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

// ── Buses ─────────────────────────────────────────────────────────────────────

export const buses = pgTable("buses", {
  id: text("id").primaryKey(), // e.g. "MNG-101"
  number: text("number").notNull().unique(),
  operatorId: uuid("operator_id").references(() => operators.id),
  licensePlate: text("license_plate").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  fullFare: integer("full_fare").notNull(),
  driverName: text("driver_name").notNull(),
  conductorName: text("conductor_name").notNull(),
  status: busStatusEnum("status").notNull().default("Running"),
  statusNote: text("status_note").notNull().default(""),
  schedule: jsonb("schedule").$type<string[]>().notNull().default([]),
  totalSeats: integer("total_seats").notNull(),
  occupiedSeats: integer("occupied_seats").notNull().default(0),
  womenReservedTotal: integer("women_reserved_total").notNull().default(0),
  womenReservedAvailable: integer("women_reserved_available")
    .notNull()
    .default(0),
  studentCardAccepted: boolean("student_card_accepted")
    .notNull()
    .default(false),
  studentDiscountPercent: integer("student_discount_percent")
    .notNull()
    .default(0),
  votes: jsonb("votes")
    .$type<{
      onTime: number;
      slightlyLate: number;
      veryLate: number;
    }>()
    .notNull()
    .default({ onTime: 0, slightlyLate: 0, veryLate: 0 }),
  routeGeometry:
    jsonb("route_geometry").$type<{ lat: number; lng: number }[]>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Bus routes (ordered stop list) ───────────────────────────────────────────

export const busRoutes = pgTable(
  "bus_routes",
  {
    busId: text("bus_id")
      .notNull()
      .references(() => buses.id, { onDelete: "cascade" }),
    stopId: text("stop_id")
      .notNull()
      .references(() => stops.id),
    stopOrder: integer("stop_order").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.busId, t.stopId] }),
  }),
);

// ── Bus requests (operator submits, admin approves) ───────────────────────────

export const busRequests = pgTable("bus_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "cascade" }),

  number: text("number").notNull(),
  licensePlate: text("license_plate").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  fullFare: integer("full_fare").notNull(),
  driverName: text("driver_name").notNull(),
  conductorName: text("conductor_name").notNull(),
  totalSeats: integer("total_seats").notNull(),
  schedule: jsonb("schedule").$type<string[]>().notNull().default([]),
  womenReservedTotal: integer("women_reserved_total").notNull().default(0),
  studentCardAccepted: boolean("student_card_accepted").notNull().default(false),
  studentDiscountPercent: integer("student_discount_percent").notNull().default(0),
  routeStopIds: jsonb("route_stop_ids").$type<string[]>().notNull().default([]),

  operatorAadhaar: text("operator_aadhaar"),
  operatorLicense: text("operator_license"),
  rcNumber: text("rc_number"),
  pollutionCertNumber: text("pollution_cert_number"),
  insurancePolicyNumber: text("insurance_policy_number"),

  status: busRequestStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Complaints ────────────────────────────────────────────────────────────────

export const complaints = pgTable("complaints", {
  id: uuid("id").defaultRandom().primaryKey(),
  busId: text("bus_id")
    .notNull()
    .references(() => buses.id),
  userId: uuid("user_id").references(() => users.id), // nullable — allow guest complaints
  busNumber: text("bus_number").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  status: complaintStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Payments ──────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  busId: text("bus_id")
    .notNull()
    .references(() => buses.id),
  userId: uuid("user_id").references(() => users.id),
  busNumber: text("bus_number").notNull(),
  amount: integer("amount").notNull(),
  upiId: text("upi_id"),
  transactionId: text("transaction_id").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Travel history (OCR tickets) ─────────────────────────────────────────────

export const travelHistory = pgTable("travel_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  busId: text("bus_id").references(() => buses.id),
  busNumber: text("bus_number"), // from OCR — may not match a known bus
  fromStop: text("from_stop"),
  toStop: text("to_stop"),
  scannedFare: integer("scanned_fare"), // what the ticket says
  expectedFare: integer("expected_fare"), // what calcFare() returns
  overchargeDelta: integer("overcharge_delta"), // scanned - expected (positive = overcharged)
  ticketImageUrl: text("ticket_image_url"),
  rawOcrText: text("raw_ocr_text"),
  travelDate: timestamp("travel_date"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Loyalty / offers ──────────────────────────────────────────────────────────

export const loyaltyAccounts = pgTable("loyalty_accounts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalPoints: integer("total_points").notNull().default(0),
  totalTrips: integer("total_trips").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Relations (for Drizzle relational queries) ────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  operator: one(operators, {
    fields: [users.id],
    references: [operators.userId],
  }),
  complaints: many(complaints),
  payments: many(payments),
  travelHistory: many(travelHistory),
  loyaltyAccount: one(loyaltyAccounts, {
    fields: [users.id],
    references: [loyaltyAccounts.userId],
  }),
}));

export const operatorsRelations = relations(operators, ({ one, many }) => ({
  user: one(users, { fields: [operators.userId], references: [users.id] }),
  buses: many(buses),
  busRequests: many(busRequests),
}));

export const busRequestsRelations = relations(busRequests, ({ one }) => ({
  operator: one(operators, {
    fields: [busRequests.operatorId],
    references: [operators.id],
  }),
}));

export const busesRelations = relations(buses, ({ one, many }) => ({
  operator: one(operators, {
    fields: [buses.operatorId],
    references: [operators.id],
  }),
  routes: many(busRoutes),
  complaints: many(complaints),
  payments: many(payments),
}));

export const busRoutesRelations = relations(busRoutes, ({ one }) => ({
  bus: one(buses, { fields: [busRoutes.busId], references: [buses.id] }),
  stop: one(stops, { fields: [busRoutes.stopId], references: [stops.id] }),
}));

export const stopsRelations = relations(stops, ({ many }) => ({
  routes: many(busRoutes),
}));

export const complaintsRelations = relations(complaints, ({ one }) => ({
  bus: one(buses, { fields: [complaints.busId], references: [buses.id] }),
  user: one(users, { fields: [complaints.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bus: one(buses, { fields: [payments.busId], references: [buses.id] }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const travelHistoryRelations = relations(travelHistory, ({ one }) => ({
  user: one(users, { fields: [travelHistory.userId], references: [users.id] }),
  bus: one(buses, { fields: [travelHistory.busId], references: [buses.id] }),
}));

// ── TypeScript types inferred from schema ────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Operator = typeof operators.$inferSelect;
export type Bus = typeof buses.$inferSelect;
export type Stop = typeof stops.$inferSelect;
export type BusRoute = typeof busRoutes.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type TravelHistory = typeof travelHistory.$inferSelect;
export type NewTravelHistory = typeof travelHistory.$inferInsert;
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type BusRequest = typeof busRequests.$inferSelect;
export type NewBusRequest = typeof busRequests.$inferInsert;
