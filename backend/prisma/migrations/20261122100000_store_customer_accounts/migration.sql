-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "zaloAppSecretEnc" TEXT;

-- AlterTable
ALTER TABLE "StoreCustomer" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCustomer_storeId_zaloUserId_key" ON "StoreCustomer"("storeId", "zaloUserId");

