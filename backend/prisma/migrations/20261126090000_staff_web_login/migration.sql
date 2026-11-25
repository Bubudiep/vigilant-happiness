-- AlterTable
ALTER TABLE "StoreStaff" ADD COLUMN     "adminSections" JSONB,
ADD COLUMN     "loginEmail" TEXT;

-- CreateIndex
CREATE INDEX "StoreStaff_loginEmail_idx" ON "StoreStaff"("loginEmail");

