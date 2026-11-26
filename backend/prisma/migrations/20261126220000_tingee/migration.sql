-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "tingeeClientId" TEXT,
ADD COLUMN     "tingeeSecretEnc" TEXT;

-- CreateTable
CREATE TABLE "StorePaymentRequest" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "transactionCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBankTransaction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "transactionCode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "content" TEXT,
    "bank" TEXT,
    "accountNumber" TEXT,
    "transactionDate" TIMESTAMP(3),
    "matchedRef" TEXT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreBankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePaymentRequest_storeId_status_createdAt_idx" ON "StorePaymentRequest"("storeId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentRequest_storeId_ref_key" ON "StorePaymentRequest"("storeId", "ref");

-- CreateIndex
CREATE INDEX "StoreBankTransaction_storeId_createdAt_idx" ON "StoreBankTransaction"("storeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBankTransaction_storeId_transactionCode_key" ON "StoreBankTransaction"("storeId", "transactionCode");

-- AddForeignKey
ALTER TABLE "StorePaymentRequest" ADD CONSTRAINT "StorePaymentRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBankTransaction" ADD CONSTRAINT "StoreBankTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

