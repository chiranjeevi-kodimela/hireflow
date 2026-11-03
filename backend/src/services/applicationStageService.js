const prisma = require("../config/database");
const {
  getRequiredInterviewType,
  getStageGateError,
} = require("./applicationStageRules");

const allowedNextStages = {
  APPLIED: ["SCREENING"],
  SCREENING: ["TECHNICAL"],
  TECHNICAL: ["MANAGERIAL"],
  MANAGERIAL: ["HR"],
  HR: ["OFFER"],
  OFFER: ["HIRED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const getStatusForStage = (stage) => {
  if (stage === "REJECTED") return "REJECTED";
  if (stage === "WITHDRAWN") return "WITHDRAWN";
  if (stage === "HIRED") return "HIRED";
  return "ACTIVE";
};

const updateApplicationStage = async (applicationId, data) => {
  const { toStage, reason, changedById } = data;

  if (!applicationId || typeof applicationId !== "string") {
    const error = new Error("Valid application ID is required");
    error.statusCode = 400;
    throw error;
  }

  const validStages = [
    "APPLIED",
    "SCREENING",
    "TECHNICAL",
    "MANAGERIAL",
    "HR",
    "OFFER",
    "HIRED",
    "REJECTED",
    "WITHDRAWN",
  ];

  if (!validStages.includes(toStage)) {
    const error = new Error("Invalid application stage");
    error.statusCode = 400;
    throw error;
  }

  if (typeof reason !== "string" || !reason.trim()) {
    const error = new Error("A reason for the stage change is required");
    error.statusCode = 400;
    throw error;
  }

  if (changedById !== undefined && typeof changedById !== "string") {
    const error = new Error("Invalid employee ID");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { applicationId },
    });

    if (!application) {
      const error = new Error("Application not found");
      error.statusCode = 404;
      throw error;
    }

    if (application.status !== "ACTIVE") {
      const error = new Error(
        "Cannot change the stage of a closed application",
      );
      error.statusCode = 400;
      throw error;
    }

    const isNormalTransition =
      allowedNextStages[application.currentStage].includes(toStage);

    const isTerminalTransition =
      toStage === "REJECTED" || toStage === "WITHDRAWN";

    if (!isNormalTransition && !isTerminalTransition) {
      const error = new Error(
        `Invalid transition from ${application.currentStage} to ${toStage}`,
      );
      error.statusCode = 400;
      throw error;
    }

    if (isNormalTransition) {
      const requiredInterviewType = getRequiredInterviewType(toStage);
      const interviews = requiredInterviewType
        ? await tx.interview.findMany({
            where: {
              applicationId,
              interviewType: requiredInterviewType,
              status: { not: "CANCELLED" },
            },
            include: {
              participants: { select: { employeeId: true, role: true } },
              scorecards: { select: { reviewerId: true } },
            },
          })
        : [];
      const acceptedOffer =
        toStage === "HIRED"
          ? await tx.offer.findFirst({
              where: { applicationId, status: "ACCEPTED" },
              select: { offerId: true },
            })
          : null;
      const gateError = getStageGateError(
        toStage,
        interviews,
        Boolean(acceptedOffer),
      );

      if (gateError) {
        const error = new Error(gateError);
        error.statusCode = 409;
        throw error;
      }
    }

    if (changedById) {
      const employee = await tx.employee.findUnique({
        where: { employeeId: changedById },
      });

      if (!employee) {
        const error = new Error("Employee not found");
        error.statusCode = 404;
        throw error;
      }
    }

    const newStatus = getStatusForStage(toStage);

    // Prevent a concurrent request from overwriting another transition.
    const updateResult = await tx.application.updateMany({
      where: {
        applicationId,
        currentStage: application.currentStage,
        status: "ACTIVE",
      },
      data: {
        currentStage: toStage,
        status: newStatus,
      },
    });

    if (updateResult.count !== 1) {
      const error = new Error(
        "Application was modified by another request. Please try again.",
      );
      error.statusCode = 409;
      throw error;
    }

    const eventCount = await tx.applicationStageEvent.count({
      where: { applicationId },
    });

    await tx.applicationStageEvent.create({
      data: {
        eventId: `${applicationId}-EVT-${String(eventCount + 1).padStart(3, "0")}`,
        applicationId,
        fromStage: application.currentStage,
        toStage,
        changedById: changedById || null,
        reason: reason.trim(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: changedById || null,
        action: "APPLICATION_STAGE_CHANGED",
        entityType: "Application",
        entityId: applicationId,
        details: {
          fromStage: application.currentStage,
          toStage,
          newStatus,
          reason: reason.trim(),
        },
      },
    });

    return tx.application.findUnique({
      where: { applicationId },
      include: {
        candidate: true,
        requisition: true,
        stageEvents: {
          orderBy: { changedAt: "asc" },
        },
      },
    });
  });
};

module.exports = { updateApplicationStage };
