-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('REQUISITION', 'OFFER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EvaluationCriterion" (
    "criterionId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCriterion_pkey" PRIMARY KEY ("criterionId")
);

-- CreateTable
CREATE TABLE "ScorecardItem" (
    "itemId" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DECIMAL(4,2) NOT NULL,
    "comments" TEXT,

    CONSTRAINT "ScorecardItem_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "Offer" (
    "offerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("offerId")
);

-- CreateTable
CREATE TABLE "Approval" (
    "approvalId" TEXT NOT NULL,
    "offerId" TEXT,
    "requisitionId" TEXT,
    "approverId" TEXT NOT NULL,
    "approvalType" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("approvalId")
);

-- CreateTable
CREATE TABLE "ApplicationStageEvent" (
    "eventId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStageEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "auditLogId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("auditLogId")
);

-- CreateIndex
CREATE INDEX "EvaluationCriterion_requisitionId_idx" ON "EvaluationCriterion"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScorecardItem_scorecardId_criterionId_key" ON "ScorecardItem"("scorecardId", "criterionId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_applicationId_version_key" ON "Offer"("applicationId", "version");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_approverId_idx" ON "Approval"("approverId");

-- CreateIndex
CREATE INDEX "ApplicationStageEvent_applicationId_changedAt_idx" ON "ApplicationStageEvent"("applicationId", "changedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "EvaluationCriterion" ADD CONSTRAINT "EvaluationCriterion_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("requisitionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardItem" ADD CONSTRAINT "ScorecardItem_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("scorecardId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardItem" ADD CONSTRAINT "ScorecardItem_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion"("criterionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("applicationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("offerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("requisitionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStageEvent" ADD CONSTRAINT "ApplicationStageEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("applicationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStageEvent" ADD CONSTRAINT "ApplicationStageEvent_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Employee"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;
