-- AlterTable
ALTER TABLE "StoreStaff" ADD COLUMN     "attendanceCode" TEXT;

-- CreateTable
CREATE TABLE "StoreAttendance" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "workDate" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'present',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "deviceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreAttendance_storeId_workDate_idx" ON "StoreAttendance"("storeId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "StoreAttendance_staffId_workDate_key" ON "StoreAttendance"("staffId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStaff_storeId_attendanceCode_key" ON "StoreStaff"("storeId", "attendanceCode");

-- AddForeignKey
ALTER TABLE "StoreAttendance" ADD CONSTRAINT "StoreAttendance_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAttendance" ADD CONSTRAINT "StoreAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StoreStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

