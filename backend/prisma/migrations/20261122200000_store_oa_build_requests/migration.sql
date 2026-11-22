-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "oaSecretEnc" TEXT;

-- CreateTable
CREATE TABLE "StoreBuildRequest" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_admin',
    "appName" TEXT,
    "appId" TEXT,
    "note" TEXT,
    "adminNote" TEXT,
    "publishedUrl" TEXT,
    "snapshot" JSONB NOT NULL,
    "requestedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreBuildRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreBuildRequest_storeId_createdAt_idx" ON "StoreBuildRequest"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreBuildRequest_status_createdAt_idx" ON "StoreBuildRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_storeId_status_lastMessageAt_idx" ON "Conversation"("storeId", "status", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBuildRequest" ADD CONSTRAINT "StoreBuildRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

