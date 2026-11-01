-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'BOOKED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'MANAGERIAL', 'HR', 'SCREENING');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('LEAD', 'PANELIST', 'OBSERVER');

-- CreateEnum
CREATE TYPE "ScoreRecommendation" AS ENUM ('STRONG_YES', 'YES', 'MAYBE', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateTable
CREATE TABLE "SkillRequirement" (
    "skillRequirementId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "minimumLevel" "SkillLevel" NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillRequirement_pkey" PRIMARY KEY ("skillRequirementId")
);

-- CreateTable
CREATE TABLE "InterviewPanel" (
    "panelId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "panelName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPanel_pkey" PRIMARY KEY ("panelId")
);

-- CreateTable
CREATE TABLE "PanelMember" (
    "panelMemberId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanelMember_pkey" PRIMARY KEY ("panelMemberId")
);

-- CreateTable
CREATE TABLE "Availability" (
    "availabilityId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("availabilityId")
);

-- CreateTable
CREATE TABLE "Interview" (
    "interviewId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "interviewType" "InterviewType" NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("interviewId")
);

-- CreateTable
CREATE TABLE "InterviewParticipant" (
    "participantId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,

    CONSTRAINT "InterviewParticipant_pkey" PRIMARY KEY ("participantId")
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "scorecardId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "technicalScore" DECIMAL(3,2) NOT NULL,
    "communicationScore" DECIMAL(3,2) NOT NULL,
    "problemSolvingScore" DECIMAL(3,2) NOT NULL,
    "recommendation" "ScoreRecommendation" NOT NULL,
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("scorecardId")
);

-- CreateIndex
CREATE INDEX "SkillRequirement_requisitionId_idx" ON "SkillRequirement"("requisitionId");

-- CreateIndex
CREATE INDEX "InterviewPanel_requisitionId_idx" ON "InterviewPanel"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelMember_panelId_employeeId_key" ON "PanelMember"("panelId", "employeeId");

-- CreateIndex
CREATE INDEX "Availability_interviewerId_startTime_endTime_idx" ON "Availability"("interviewerId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- CreateIndex
CREATE INDEX "Interview_panelId_startTime_endTime_idx" ON "Interview"("panelId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "InterviewParticipant_employeeId_idx" ON "InterviewParticipant"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewParticipant_interviewId_employeeId_key" ON "InterviewParticipant"("interviewId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_interviewId_reviewerId_key" ON "Scorecard"("interviewId", "reviewerId");

-- AddForeignKey
ALTER TABLE "SkillRequirement" ADD CONSTRAINT "SkillRequirement_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("requisitionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("requisitionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMember" ADD CONSTRAINT "PanelMember_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "InterviewPanel"("panelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelMember" ADD CONSTRAINT "PanelMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("applicationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "InterviewPanel"("panelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("interviewId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("interviewId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;
