-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN     "treatmentIntervalDays" INTEGER,
ADD COLUMN     "treatmentSessions" INTEGER;

-- AlterTable
ALTER TABLE "StoreBooking" ADD COLUMN     "treatmentId" TEXT,
ADD COLUMN     "treatmentName" TEXT,
ADD COLUMN     "treatmentSeq" INTEGER,
ADD COLUMN     "treatmentTotal" INTEGER;

-- CreateIndex
CREATE INDEX "StoreBooking_storeId_treatmentId_idx" ON "StoreBooking"("storeId", "treatmentId");

