-- AlterTable
ALTER TABLE "StoreCustomer" ADD COLUMN     "walletBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StoreWalletTxn" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "method" TEXT,
    "orderId" TEXT,
    "orderCode" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreWalletTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreWalletTxn_storeId_customerId_createdAt_idx" ON "StoreWalletTxn"("storeId", "customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoreWalletTxn" ADD CONSTRAINT "StoreWalletTxn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreWalletTxn" ADD CONSTRAINT "StoreWalletTxn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StoreCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

