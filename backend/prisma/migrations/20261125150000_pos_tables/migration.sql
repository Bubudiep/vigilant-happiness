-- CreateTable
CREATE TABLE "StoreArea" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTable" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "areaId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'table',
    "seats" INTEGER,
    "pricePerHour" INTEGER NOT NULL DEFAULT 0,
    "blockMinutes" INTEGER NOT NULL DEFAULT 30,
    "minMinutes" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'ready',
    "stateNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTableSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "guestCount" INTEGER,
    "customerId" TEXT,
    "customerName" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "pricePerHour" INTEGER NOT NULL DEFAULT 0,
    "blockMinutes" INTEGER NOT NULL DEFAULT 30,
    "minMinutes" INTEGER NOT NULL DEFAULT 0,
    "timeCharge" INTEGER NOT NULL DEFAULT 0,
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTableSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreArea_storeId_sortOrder_idx" ON "StoreArea"("storeId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoreTable_storeId_areaId_sortOrder_idx" ON "StoreTable"("storeId", "areaId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoreTableSession_storeId_status_idx" ON "StoreTableSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "StoreTableSession_tableId_status_idx" ON "StoreTableSession"("tableId", "status");

-- AddForeignKey
ALTER TABLE "StoreArea" ADD CONSTRAINT "StoreArea_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTable" ADD CONSTRAINT "StoreTable_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTable" ADD CONSTRAINT "StoreTable_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "StoreArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTableSession" ADD CONSTRAINT "StoreTableSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTableSession" ADD CONSTRAINT "StoreTableSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "StoreTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

