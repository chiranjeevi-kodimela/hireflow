const prisma = require("../config/database");

const getDashboardSummary = async () => {
  const [
    totalCandidates,
    requisitionCounts,
    scheduledInterviews,
    successfulHires,
    recentActivity,
    applicationStageCounts,
    applications,
    offerCounts,
    offerApprovalCounts,
    hiringManagers,
  ] = await Promise.all([
    prisma.candidate.count(),

    prisma.requisition.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    prisma.interview.count({
      where: { status: "SCHEDULED" },
    }),

    prisma.application.count({
      where: { currentStage: "HIRED" },
    }),

    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        auditLogId: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        createdAt: true,
      },
    }),

    prisma.application.groupBy({
      by: ["currentStage"],
      _count: { _all: true },
    }),

    prisma.application.findMany({
      select: {
        applicationId: true,
        currentStage: true,
        status: true,
        appliedAt: true,
        stageEvents: {
          orderBy: { changedAt: "asc" },
          select: {
            fromStage: true,
            toStage: true,
            changedAt: true,
          },
        },
      },
    }),

    prisma.offer.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    prisma.approval.groupBy({
      by: ["status"],
      where: { approvalType: "OFFER" },
      _count: { _all: true },
    }),

    prisma.hiringManager.findMany({
      where: { isActive: true },
      select: {
        hiringManagerId: true,
        employee: {
          select: {
            fullName: true,
          },
        },
        requisitions: {
          select: {
            requisitionId: true,
            applications: {
              select: {
                status: true,
                currentStage: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Convert grouped results into lookup objects.
  const stageCounts = Object.fromEntries(
    applicationStageCounts.map((item) => [item.currentStage, item._count._all]),
  );

  const requisitionStatus = Object.fromEntries(
    requisitionCounts.map((item) => [item.status, item._count._all]),
  );

  const offerStatus = Object.fromEntries(
    offerCounts.map((item) => [item.status, item._count._all]),
  );

  const approvalStatus = Object.fromEntries(
    offerApprovalCounts.map((item) => [item.status, item._count._all]),
  );

  // Existing dashboard pipeline.
  const pipeline = {
    stages: {
      applied: stageCounts.APPLIED || 0,
      screening: stageCounts.SCREENING || 0,
      interview:
        (stageCounts.TECHNICAL || 0) +
        (stageCounts.MANAGERIAL || 0) +
        (stageCounts.HR || 0),
      offer: stageCounts.OFFER || 0,
      hired: stageCounts.HIRED || 0,
    },
  };

  pipeline.totalApplications = Object.values(pipeline.stages).reduce(
    (total, count) => total + count,
    0,
  );

  // Complete hiring funnel, including closed application stages.
  const hiringFunnel = [
    { stage: "Applied", count: stageCounts.APPLIED || 0 },
    { stage: "Screening", count: stageCounts.SCREENING || 0 },
    { stage: "Technical", count: stageCounts.TECHNICAL || 0 },
    { stage: "Managerial", count: stageCounts.MANAGERIAL || 0 },
    { stage: "HR", count: stageCounts.HR || 0 },
    { stage: "Offer", count: stageCounts.OFFER || 0 },
    { stage: "Hired", count: stageCounts.HIRED || 0 },
    { stage: "Rejected", count: stageCounts.REJECTED || 0 },
    { stage: "Withdrawn", count: stageCounts.WITHDRAWN || 0 },
  ];

  // Average time to hire, based on the actual HIRED stage event.
  const hiringDurations = [];

  // Track time spent in each application stage.
  const stageDurationTotals = {};
  const stageDurationCounts = {};

  const now = new Date();

  for (const application of applications) {
    const events = application.stageEvents;

    const hiredEvent = [...events]
      .reverse()
      .find((event) => event.toStage === "HIRED");

    if (application.currentStage === "HIRED" && hiredEvent) {
      const days =
        (hiredEvent.changedAt - application.appliedAt) / (1000 * 60 * 60 * 24);

      if (days >= 0) {
        hiringDurations.push(days);
      }
    }

    let currentStage = "APPLIED";
    let stageEnteredAt = application.appliedAt;

    for (const event of events) {
      const duration =
        (event.changedAt - stageEnteredAt) / (1000 * 60 * 60 * 24);

      if (duration >= 0 && currentStage) {
        stageDurationTotals[currentStage] =
          (stageDurationTotals[currentStage] || 0) + duration;

        stageDurationCounts[currentStage] =
          (stageDurationCounts[currentStage] || 0) + 1;
      }

      currentStage = event.toStage;
      stageEnteredAt = event.changedAt;
    }

    // Include time spent in the current stage for active applications.
    if (application.status === "ACTIVE") {
      const duration = (now - stageEnteredAt) / (1000 * 60 * 60 * 24);

      if (duration >= 0) {
        stageDurationTotals[currentStage] =
          (stageDurationTotals[currentStage] || 0) + duration;

        stageDurationCounts[currentStage] =
          (stageDurationCounts[currentStage] || 0) + 1;
      }
    }
  }

  const averageTimeToHire = hiringDurations.length
    ? Number(
        (
          hiringDurations.reduce((sum, days) => sum + days, 0) /
          hiringDurations.length
        ).toFixed(1),
      )
    : 0;

  const averageStageDuration = Object.entries(stageDurationTotals).map(
    ([stage, totalDays]) => ({
      stage,
      averageDays: Number((totalDays / stageDurationCounts[stage]).toFixed(1)),
      applications: stageDurationCounts[stage],
    }),
  );

  // Offer and approval metrics.
  const approvedApprovals = approvalStatus.APPROVED || 0;
  const rejectedApprovals = approvalStatus.REJECTED || 0;
  const decidedApprovals = approvedApprovals + rejectedApprovals;

  const offerApprovalRate = decidedApprovals
    ? Number(((approvedApprovals / decidedApprovals) * 100).toFixed(1))
    : 0;

  const offerRejectionRate = decidedApprovals
    ? Number(((rejectedApprovals / decidedApprovals) * 100).toFixed(1))
    : 0;

  const totalOffers = Object.values(offerStatus).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Hiring-manager performance based on assigned requisitions.
  const managerPerformance = hiringManagers
    .map((manager) => {
      const managerApplications = manager.requisitions.flatMap(
        (requisition) => requisition.applications,
      );

      return {
        hiringManagerId: manager.hiringManagerId,
        name: manager.employee.fullName,
        requisitions: manager.requisitions.length,
        applications: managerApplications.length,
        hires: managerApplications.filter(
          (application) => application.currentStage === "HIRED",
        ).length,
      };
    })
    .sort((a, b) => b.hires - a.hires);

  return {
    metrics: {
      totalCandidates,
      openRequisitions: requisitionStatus.OPEN || 0,
      scheduledInterviews,
      successfulHires,
    },

    recentActivity,

    pipeline,

    analytics: {
      hiringFunnel,

      averageTimeToHire,

      averageStageDuration,

      requisitions: {
        open: requisitionStatus.OPEN || 0,
        draft: requisitionStatus.DRAFT || 0,
        pendingApproval: requisitionStatus.PENDING_APPROVAL || 0,
        onHold: requisitionStatus.ON_HOLD || 0,
        closed: requisitionStatus.CLOSED || 0,
        cancelled: requisitionStatus.CANCELLED || 0,
      },

      offers: {
        total: totalOffers,
        pendingApproval: offerStatus.PENDING_APPROVAL || 0,
        approved: offerStatus.APPROVED || 0,
        sent: offerStatus.SENT || 0,
        accepted: offerStatus.ACCEPTED || 0,
        rejected: offerStatus.REJECTED || 0,
        approvalRate: offerApprovalRate,
        rejectionRate: offerRejectionRate,
        pendingApprovals: approvalStatus.PENDING || 0,
      },

      hiringManagers: managerPerformance,
    },
  };
};

module.exports = {
  getDashboardSummary,
};
