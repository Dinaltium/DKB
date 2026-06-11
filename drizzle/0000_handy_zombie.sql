CREATE TYPE "public"."bus_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."bus_status" AS ENUM('Running', 'Not Running', 'Delayed');--> statement-breakpoint
CREATE TYPE "public"."chest_type" AS ENUM('normal', 'silver', 'gold', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."complaint_cat_status" AS ENUM('open', 'under_review', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."pass_status" AS ENUM('pending_verification', 'active', 'expired', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pass_type" AS ENUM('student', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending_verification', 'active', 'expired', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ticket_payment_status" AS ENUM('pending', 'initiated', 'confirmed', 'failed', 'cash');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('pending', 'paid', 'validated', 'cancelled', 'cash');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'confirmed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('ticket_payment', 'subscription_payment', 'pass_payment', 'cashback', 'wallet_credit', 'wallet_debit');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('passenger', 'operator', 'conductor', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "bus_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"number" text NOT NULL,
	"license_plate" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"full_fare" integer NOT NULL,
	"driver_name" text NOT NULL,
	"conductor_name" text NOT NULL,
	"total_seats" integer NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"women_reserved_total" integer DEFAULT 0 NOT NULL,
	"student_card_accepted" boolean DEFAULT false NOT NULL,
	"student_discount_percent" integer DEFAULT 0 NOT NULL,
	"route_stop_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operator_aadhaar" text,
	"operator_license" text,
	"rc_number" text,
	"pollution_cert_number" text,
	"insurance_policy_number" text,
	"status" "bus_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bus_routes" (
	"bus_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"stop_order" integer NOT NULL,
	CONSTRAINT "bus_routes_bus_id_stop_id_pk" PRIMARY KEY("bus_id","stop_id")
);
--> statement-breakpoint
CREATE TABLE "buses" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"operator_id" uuid,
	"license_plate" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"full_fare" integer NOT NULL,
	"driver_name" text NOT NULL,
	"conductor_name" text NOT NULL,
	"status" "bus_status" DEFAULT 'Running' NOT NULL,
	"status_note" text DEFAULT '' NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_seats" integer NOT NULL,
	"occupied_seats" integer DEFAULT 0 NOT NULL,
	"women_reserved_total" integer DEFAULT 0 NOT NULL,
	"women_reserved_available" integer DEFAULT 0 NOT NULL,
	"student_card_accepted" boolean DEFAULT false NOT NULL,
	"student_discount_percent" integer DEFAULT 0 NOT NULL,
	"votes" jsonb DEFAULT '{"onTime":0,"slightlyLate":0,"veryLate":0}'::jsonb NOT NULL,
	"route_geometry" jsonb,
	"seat_layout" text DEFAULT '2x2' NOT NULL,
	"qr_code_data" text,
	"is_live" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buses_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "chests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"chest_type" "chest_type" NOT NULL,
	"xp_at_earn" integer NOT NULL,
	"is_opened" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp,
	"reward_type" text,
	"reward_value" text,
	"rarity" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bus_id" text NOT NULL,
	"user_id" uuid,
	"bus_number" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"status" "complaint_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conductor_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"conductor_id" uuid NOT NULL,
	"bus_id" text NOT NULL,
	"operator_id" uuid NOT NULL,
	"conductor_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conductor_access_conductor_code_unique" UNIQUE("conductor_code")
);
--> statement-breakpoint
CREATE TABLE "earned_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fares" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"from_stop_id" integer NOT NULL,
	"to_stop_id" integer NOT NULL,
	"fare_inr" numeric(8, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"total_trips" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"phone" text,
	"approved" boolean DEFAULT false NOT NULL,
	"aadhar" text,
	"driving_license" text,
	"rc_number" text,
	"pollution_cert_no" text,
	"insurance_policy_no" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pass_uid" text NOT NULL,
	"user_id" uuid NOT NULL,
	"pass_type" "pass_type" NOT NULL,
	"student_name" text,
	"college_name" text,
	"student_id_number" text,
	"year_of_passing" integer,
	"application_fee_inr" numeric(8, 2) DEFAULT '50' NOT NULL,
	"fee_txn_id" text,
	"status" "pass_status" DEFAULT 'pending_verification' NOT NULL,
	"rejection_reason" text,
	"verified_by" uuid,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "passes_pass_uid_unique" UNIQUE("pass_uid")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bus_id" text NOT NULL,
	"user_id" uuid,
	"bus_number" text NOT NULL,
	"amount" integer NOT NULL,
	"upi_id" text,
	"transaction_id" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"xp_points" integer DEFAULT 0 NOT NULL,
	"xp_level" text DEFAULT 'Newcomer' NOT NULL,
	"active_title" text DEFAULT 'New Rider' NOT NULL,
	"total_km" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pending_cashback_inr" numeric(8, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"stop_name" text NOT NULL,
	"stop_order" integer NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_name" text NOT NULL,
	"start_city" text NOT NULL,
	"end_city" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sticker_key" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"operator_id" uuid NOT NULL,
	"num_buses" integer DEFAULT 1 NOT NULL,
	"amount_paid_inr" numeric(10, 2) NOT NULL,
	"upi_txn_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'pending_verification' NOT NULL,
	"rejection_reason" text,
	"verified_by" uuid,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_uid" text NOT NULL,
	"user_id" uuid,
	"guest_name" text,
	"guest_phone" text,
	"trip_id" integer,
	"from_stop_id" integer,
	"to_stop_id" integer,
	"from_stop_name" text NOT NULL,
	"to_stop_name" text NOT NULL,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"original_fare_inr" numeric(8, 2) NOT NULL,
	"discount_type" text,
	"discount_amount_inr" numeric(8, 2) DEFAULT '0' NOT NULL,
	"cashback_used_inr" numeric(8, 2) DEFAULT '0' NOT NULL,
	"final_fare_inr" numeric(8, 2) NOT NULL,
	"distance_km" numeric(8, 2) DEFAULT '0' NOT NULL,
	"qr_hash" text NOT NULL,
	"status" "ticket_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "ticket_payment_status" DEFAULT 'pending' NOT NULL,
	"payment_ref" text,
	"payment_method" text,
	"upi_app" text,
	"is_guest" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticket_uid_unique" UNIQUE("ticket_uid")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"user_id" uuid,
	"operator_id" uuid,
	"amount_inr" numeric(8, 2) NOT NULL,
	"type" "transaction_type" DEFAULT 'ticket_payment' NOT NULL,
	"upi_txn_id" text,
	"operator_upi_id" text,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bus_id" text,
	"bus_number" text,
	"from_stop" text,
	"to_stop" text,
	"scanned_fare" integer,
	"expected_fare" integer,
	"overcharge_delta" integer,
	"ticket_image_url" text,
	"raw_ocr_text" text,
	"travel_date" timestamp,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer,
	"conductor_id" uuid,
	"bus_id" text,
	"total_passengers" integer DEFAULT 0 NOT NULL,
	"digital_tickets" integer DEFAULT 0 NOT NULL,
	"cash_tickets" integer DEFAULT 0 NOT NULL,
	"total_revenue_inr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"stop_id" integer,
	"stop_name" text NOT NULL,
	"stop_order" integer NOT NULL,
	"arrival_time_12" text NOT NULL,
	"arrival_period" text NOT NULL,
	"arrival_time_24" time NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7)
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"bus_id" text NOT NULL,
	"route_id" integer,
	"conductor_id" uuid,
	"departure_date" text NOT NULL,
	"departure_time_24" time NOT NULL,
	"status" "trip_status" DEFAULT 'scheduled' NOT NULL,
	"current_stop_idx" integer DEFAULT 0 NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"role" "user_role" DEFAULT 'passenger' NOT NULL,
	"phone" text,
	"upi_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"wallet_balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp,
	"password_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"event_type" text,
	"xp_earned" integer,
	"km_travelled" numeric(8, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_requests" ADD CONSTRAINT "bus_requests_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_routes" ADD CONSTRAINT "bus_routes_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_routes" ADD CONSTRAINT "bus_routes_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buses" ADD CONSTRAINT "buses_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chests" ADD CONSTRAINT "chests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductor_access" ADD CONSTRAINT "conductor_access_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductor_access" ADD CONSTRAINT "conductor_access_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conductor_access" ADD CONSTRAINT "conductor_access_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earned_titles" ADD CONSTRAINT "earned_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fares" ADD CONSTRAINT "fares_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fares" ADD CONSTRAINT "fares_from_stop_id_route_stops_id_fk" FOREIGN KEY ("from_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fares" ADD CONSTRAINT "fares_to_stop_id_route_stops_id_fk" FOREIGN KEY ("to_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operators" ADD CONSTRAINT "operators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stickers" ADD CONSTRAINT "stickers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_from_stop_id_route_stops_id_fk" FOREIGN KEY ("from_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_to_stop_id_route_stops_id_fk" FOREIGN KEY ("to_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_history" ADD CONSTRAINT "travel_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_history" ADD CONSTRAINT "travel_history_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_reports" ADD CONSTRAINT "trip_reports_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_stop_id_route_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."route_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_conductor_id_users_id_fk" FOREIGN KEY ("conductor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_conductor_bus" ON "conductor_access" USING btree ("conductor_id","bus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_title" ON "earned_titles" USING btree ("user_id","title");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_fare_route_stops" ON "fares" USING btree ("route_id","from_stop_id","to_stop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_route_stop_order" ON "route_stops" USING btree ("route_id","stop_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_trip_stop_order" ON "trip_stops" USING btree ("trip_id","stop_order");