-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "paidAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "treatmentId" TEXT;

-- CreateTable
CREATE TABLE "StorePayment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "customerId" TEXT,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTreatment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing" TEXT NOT NULL DEFAULT 'session',
    "price" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePayment_storeId_createdAt_idx" ON "StorePayment"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StorePayment_orderId_idx" ON "StorePayment"("orderId");

-- CreateIndex
CREATE INDEX "StoreTreatment_storeId_customerId_idx" ON "StoreTreatment"("storeId", "customerId");

-- AddForeignKey
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePayment" ADD CONSTRAINT "StorePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTreatment" ADD CONSTRAINT "StoreTreatment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Đơn cũ coi như đã thu đủ (không phát sinh công nợ)
UPDATE "StoreOrder" SET "paidAmount" = "totalAmount";
