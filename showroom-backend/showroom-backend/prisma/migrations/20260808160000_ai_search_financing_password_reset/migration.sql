ALTER TABLE "orders"
  ADD COLUMN "payment_due_amount" DECIMAL(15,0),
  ADD COLUMN "payment_plan" TEXT NOT NULL DEFAULT 'full',
  ADD COLUMN "financing_amount" DECIMAL(15,0) NOT NULL DEFAULT 0,
  ADD COLUMN "financing_months" INTEGER;

UPDATE "orders" SET "payment_due_amount" = "total_amount";
ALTER TABLE "orders" ALTER COLUMN "payment_due_amount" SET NOT NULL;

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx"
  ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx"
  ON "password_reset_tokens"("expires_at");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "car_embeddings" ("id", "car_id", "content")
SELECT
  gen_random_uuid()::text,
  "id",
  concat_ws(' | ', "stock_code", "vin", "brand", "model", "year"::text,
    "price"::text, "mileage"::text, "fuel_type", "transmission", "condition"::text,
    "description", "specs"::text)
FROM "cars"
ON CONFLICT ("car_id") DO UPDATE SET "content" = EXCLUDED."content";
