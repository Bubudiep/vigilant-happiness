-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "stampProgram" JSONB;

-- AlterTable
ALTER TABLE "StoreCustomer" ADD COLUMN     "stampRewards" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stamps" INTEGER NOT NULL DEFAULT 0;

