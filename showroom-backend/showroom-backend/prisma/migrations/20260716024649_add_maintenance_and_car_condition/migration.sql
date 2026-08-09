/*
  Warnings:

  - The values [maintenance] on the enum `CarStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CarCondition" AS ENUM ('new_car', 'used_car');

-- AlterEnum
BEGIN;
CREATE TYPE "CarStatus_new" AS ENUM ('available', 'reserved', 'sold');
ALTER TABLE "cars" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "cars" ALTER COLUMN "status" TYPE "CarStatus_new" USING ("status"::text::"CarStatus_new");
ALTER TYPE "CarStatus" RENAME TO "CarStatus_old";
ALTER TYPE "CarStatus_new" RENAME TO "CarStatus";
DROP TYPE "CarStatus_old";
ALTER TABLE "cars" ALTER COLUMN "status" SET DEFAULT 'available';
COMMIT;

-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "condition" "CarCondition" NOT NULL DEFAULT 'new_car';

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "car_id" TEXT,
    "branch_id" TEXT,
    "service_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "cost" DECIMAL(15,0),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
