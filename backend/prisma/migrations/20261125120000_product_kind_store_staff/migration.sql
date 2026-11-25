-- AlterTable
ALTER TABLE "StoreProduct" ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'product';

-- CreateTable
CREATE TABLE "StoreStaff" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "department" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "employmentType" TEXT NOT NULL DEFAULT 'full_time',
    "startDate" TIMESTAMP(3),
    "birthday" TIMESTAMP(3),
    "baseSalary" INTEGER,
    "commissionPercent" DOUBLE PRECISION,
    "workDays" JSONB,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "services" JSONB,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreStaff_storeId_status_sortOrder_idx" ON "StoreStaff"("storeId", "status", "sortOrder");

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

