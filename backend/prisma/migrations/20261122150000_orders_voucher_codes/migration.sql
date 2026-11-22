-- AlterTable
ALTER TABLE "StoreOrder" ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'miniapp',
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "voucherCode" TEXT;

-- CreateTable
CREATE TABLE "StoreVoucherCode" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "orderCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreVoucherCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreVoucherCode_voucherId_usedAt_idx" ON "StoreVoucherCode"("voucherId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreVoucherCode_storeId_code_key" ON "StoreVoucherCode"("storeId", "code");

-- AddForeignKey
ALTER TABLE "StoreVoucherCode" ADD CONSTRAINT "StoreVoucherCode_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreVoucherCode" ADD CONSTRAINT "StoreVoucherCode_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "StoreVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Đơn cũ: tạm tính = tổng tiền
UPDATE "StoreOrder" SET "subtotal" = "totalAmount";
