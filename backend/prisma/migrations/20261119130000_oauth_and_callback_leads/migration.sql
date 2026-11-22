-- AlterTable
ALTER TABLE "ConsultationLead" ADD COLUMN     "callbackDate" TIMESTAMP(3),
ADD COLUMN     "callbackSlot" TEXT,
ADD COLUMN     "contactedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestType" TEXT NOT NULL DEFAULT 'consultation',
ADD COLUMN     "staffNote" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "OAuthApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'api',
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT,
    "secretHint" TEXT,
    "clientType" TEXT NOT NULL DEFAULT 'confidential',
    "grantTypes" TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerId" TEXT,
    "storeId" TEXT,
    "accessTokenTtl" INTEGER NOT NULL DEFAULT 3600,
    "refreshTokenTtl" INTEGER NOT NULL DEFAULT 2592000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccessToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "scope" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT,
    "accessTokenId" TEXT,
    "scope" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApplication_clientId_key" ON "OAuthApplication"("clientId");

-- CreateIndex
CREATE INDEX "OAuthApplication_customerId_active_idx" ON "OAuthApplication"("customerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_tokenHash_key" ON "OAuthAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_applicationId_expiresAt_idx" ON "OAuthAccessToken"("applicationId", "expiresAt");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_userId_idx" ON "OAuthAccessToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshToken_tokenHash_key" ON "OAuthRefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshToken_accessTokenId_key" ON "OAuthRefreshToken"("accessTokenId");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_applicationId_userId_idx" ON "OAuthRefreshToken"("applicationId", "userId");

-- CreateIndex
CREATE INDEX "ConsultationLead_requestType_callbackDate_idx" ON "ConsultationLead"("requestType", "callbackDate");

-- AddForeignKey
ALTER TABLE "ConsultationLead" ADD CONSTRAINT "ConsultationLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthApplication" ADD CONSTRAINT "OAuthApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "PlatformCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OAuthApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OAuthApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_accessTokenId_fkey" FOREIGN KEY ("accessTokenId") REFERENCES "OAuthAccessToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

