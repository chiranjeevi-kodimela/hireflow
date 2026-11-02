const prisma = require("../config/database");

const getDashboardSummary = async () => {
  const [
    totalCandidates,
    openRequisitions,
    scheduledInterviews,
    successfulHires,
    recentActivity,
    applicationStageCounts,
  ] = await Promise.all([
    // Total candidates
    prisma.candidate.count(),

    // Open requisitions
    prisma.requisition.count({
      where: {
        status: "OPEN",
      },
    }),

    // Scheduled interviews
    prisma.interview.count({
      where: {
        status: "SCHEDULED",
      },
    }),

    // Successful hires
    prisma.application.count({
      where: {
        currentStage: "HIRED",
      },
    }),

    // Latest six audit activities
    prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
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

    // Applications grouped by current stage
    prisma.application.groupBy({
      by: ["currentStage"],
      _count: {
        _all: true,
      },
    }),
  ]);

  // Convert database stage counts into an easy-to-use object
  const stageCounts = Object.fromEntries(
    applicationStageCounts.map((item) => [item.currentStage, item._count._all]),
  );

  // Combine technical, managerial and HR interviews
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

  // Calculate total applications in the displayed stages
  pipeline.totalApplications = Object.values(pipeline.stages).reduce(
    (total, count) => total + count,
    0,
  );

  return {
    metrics: {
      totalCandidates,
      openRequisitions,
      scheduledInterviews,
      successfulHires,
    },

    recentActivity,

    pipeline,
  };
};

module.exports = {
  getDashboardSummary,
};
