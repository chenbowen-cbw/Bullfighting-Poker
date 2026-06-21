CREATE TABLE "room_seats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"room_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"seat_no" smallint NOT NULL,
	"status" varchar(16) DEFAULT 'sitting' NOT NULL,
	"chips_in" bigint DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"room_code" varchar(12) NOT NULL,
	"name" varchar(64) NOT NULL,
	"owner_id" bigint NOT NULL,
	"base_score" integer DEFAULT 1 NOT NULL,
	"max_players" smallint DEFAULT 6 NOT NULL,
	"mode" varchar(24) DEFAULT 'rob_banker' NOT NULL,
	"min_chips" bigint DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "round_players" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"round_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"seat_no" smallint NOT NULL,
	"cards" jsonb,
	"niu_type" varchar(16),
	"niu_value" smallint,
	"is_banker" boolean DEFAULT false NOT NULL,
	"bet_multiplier" integer DEFAULT 1 NOT NULL,
	"rob_multiplier" integer DEFAULT 1 NOT NULL,
	"result_chips" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"room_id" bigint NOT NULL,
	"round_no" integer NOT NULL,
	"banker_user_id" bigint,
	"shuffle_seed" text,
	"shuffle_proof" text,
	"phase" varchar(24) DEFAULT 'waiting' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"round_id" bigint,
	"type" varchar(24) NOT NULL,
	"amount" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"rounds_played" integer DEFAULT 0 NOT NULL,
	"rounds_won" integer DEFAULT 0 NOT NULL,
	"banker_rounds" integer DEFAULT 0 NOT NULL,
	"total_won" bigint DEFAULT 0 NOT NULL,
	"total_lost" bigint DEFAULT 0 NOT NULL,
	"biggest_win" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"username" varchar(32) NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" varchar(64) NOT NULL,
	"avatar_url" text,
	"chips" bigint DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_seats" ADD CONSTRAINT "room_seats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_banker_user_id_users_id_fk" FOREIGN KEY ("banker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_seats_room_seat_uniq" ON "room_seats" USING btree ("room_id","seat_no");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_room_code_uniq" ON "rooms" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "round_players_round_idx" ON "round_players" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "rounds_room_idx" ON "rounds" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uniq" ON "users" USING btree ("username");