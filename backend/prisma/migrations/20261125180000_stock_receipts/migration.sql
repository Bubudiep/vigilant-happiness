-- AlterTable
ALTER TABLE "StoreOrderItem" ADD COLUMN     "unitCost" INTEGER;

-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN     "costPrice" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StoreStockReceipt" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplier" TEXT,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreStockReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreStockReceipt_storeId_receivedAt_idx" ON "StoreStockReceipt"("storeId", "receivedAt");

-- AddForeignKey
ALTER TABLE "StoreStockReceipt" ADD CONSTRAINT "StoreStockReceipt_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN     "bom" JSONB;

-- AlterTable
ALTER TABLE "StoreOrderItem" ADD COLUMN     "options" JSONB;

-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN     "options" JSONB;

