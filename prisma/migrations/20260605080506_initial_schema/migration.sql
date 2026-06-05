-- CreateEnum
CREATE TYPE "SectorProfile" AS ENUM ('FINANCIAL', 'AGRICULTURE', 'LEISURE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUBSIDIARY_OFFICER', 'CORPORATE_ANALYST', 'GLOBAL_ADMIN');

-- CreateEnum
CREATE TYPE "EmissionScope" AS ENUM ('SCOPE_1', 'SCOPE_2', 'SCOPE_3');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorProfile" "SectorProfile" NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "cognitoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sectorProfile" "SectorProfile" NOT NULL,
    "scope" "EmissionScope",

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "co2eKg" DOUBLE PRECISION,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "evidenceUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cognitoId_key" ON "User"("cognitoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "MetricDefinition_sectorProfile_idx" ON "MetricDefinition"("sectorProfile");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_metricType_sectorProfile_key" ON "MetricDefinition"("metricType", "sectorProfile");

-- CreateIndex
CREATE INDEX "MetricEntry_tenantId_reportingMonth_idx" ON "MetricEntry"("tenantId", "reportingMonth");

-- CreateIndex
CREATE INDEX "MetricEntry_metricDefinitionId_idx" ON "MetricEntry"("metricDefinitionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEntry" ADD CONSTRAINT "MetricEntry_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
