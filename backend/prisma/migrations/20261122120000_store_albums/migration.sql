-- CreateTable
CREATE TABLE "StoreAlbum" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "eventDate" TIMESTAMP(3),
    "note" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "coverPhotoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAlbumPhoto" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storageKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreAlbumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMessage" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "albumId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreAlbum_storeId_customerId_createdAt_idx" ON "StoreAlbum"("storeId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreAlbum_storeId_status_idx" ON "StoreAlbum"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreAlbumPhoto_storageKey_key" ON "StoreAlbumPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "StoreAlbumPhoto_albumId_sortOrder_idx" ON "StoreAlbumPhoto"("albumId", "sortOrder");

-- CreateIndex
CREATE INDEX "StoreMessage_storeId_customerId_createdAt_idx" ON "StoreMessage"("storeId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreMessage_storeId_direction_readAt_idx" ON "StoreMessage"("storeId", "direction", "readAt");

-- AddForeignKey
ALTER TABLE "StoreAlbum" ADD CONSTRAINT "StoreAlbum_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAlbum" ADD CONSTRAINT "StoreAlbum_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StoreCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAlbumPhoto" ADD CONSTRAINT "StoreAlbumPhoto_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "StoreAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAlbumPhoto" ADD CONSTRAINT "StoreAlbumPhoto_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMessage" ADD CONSTRAINT "StoreMessage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMessage" ADD CONSTRAINT "StoreMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StoreCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMessage" ADD CONSTRAINT "StoreMessage_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "StoreAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

