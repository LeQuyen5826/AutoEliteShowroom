-- Session-based refresh-token rotation and revocation
CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- Contact requests submitted from the public website
CREATE TABLE "contact_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_leads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments" ADD COLUMN "reference" TEXT;
ALTER TABLE "payments" ADD COLUMN "recorded_by_id" TEXT;
ALTER TABLE "contracts" ADD COLUMN "signed_by_id" TEXT;
ALTER TABLE "cars" ADD COLUMN "stock_code" TEXT;
ALTER TABLE "cars" ADD COLUMN "vin" TEXT;

-- Keep one review per customer/car even when requests arrive concurrently.
DELETE FROM "reviews" a
USING "reviews" b
WHERE a."customer_id" = b."customer_id"
  AND a."car_id" = b."car_id"
  AND (
    a."created_at" < b."created_at"
    OR (a."created_at" = b."created_at" AND a."id" < b."id")
  );

CREATE UNIQUE INDEX "reviews_customer_id_car_id_key" ON "reviews"("customer_id", "car_id");
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
CREATE UNIQUE INDEX "cars_stock_code_key" ON "cars"("stock_code");
CREATE UNIQUE INDEX "cars_vin_key" ON "cars"("vin");

CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions"("user_id");
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");
CREATE INDEX "contact_leads_status_created_at_idx" ON "contact_leads"("status", "created_at");
CREATE INDEX "cars_branch_id_status_idx" ON "cars"("branch_id", "status");
CREATE INDEX "cars_condition_status_idx" ON "cars"("condition", "status");
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");
CREATE INDEX "orders_branch_id_status_idx" ON "orders"("branch_id", "status");
CREATE INDEX "orders_car_id_status_idx" ON "orders"("car_id", "status");
CREATE INDEX "payments_order_id_paid_at_idx" ON "payments"("order_id", "paid_at");
CREATE INDEX "test_drives_customer_id_scheduled_at_idx" ON "test_drives"("customer_id", "scheduled_at");
CREATE INDEX "test_drives_branch_id_scheduled_at_idx" ON "test_drives"("branch_id", "scheduled_at");
CREATE INDEX "test_drives_car_id_scheduled_at_idx" ON "test_drives"("car_id", "scheduled_at");
CREATE INDEX "maintenances_customer_id_scheduled_at_idx" ON "maintenances"("customer_id", "scheduled_at");
CREATE INDEX "maintenances_branch_id_scheduled_at_idx" ON "maintenances"("branch_id", "scheduled_at");
CREATE INDEX "reviews_car_id_is_visible_created_at_idx" ON "reviews"("car_id", "is_visible", "created_at");

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey"
  FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_signed_by_id_fkey"
  FOREIGN KEY ("signed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
