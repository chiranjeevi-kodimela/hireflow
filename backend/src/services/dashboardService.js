const prisma = require("../config/database");

const getDashboardSummary = async () => {
  const [
    totalCandidates,
    openRequisitions,
    scheduledInterviews,
    successfulHires,
    recentActivity,
  ] = await Promise.all([
    prisma.candidate.count(),

    prisma.requisition.count({
      where: { status: "OPEN" },
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
  ]);

  return {
    metrics: {
      totalCandidates,
      openRequisitions,
      scheduledInterviews,
      successfulHires,
    },
    recentActivity,
  };
};

module.exports = { getDashboardSummary };
