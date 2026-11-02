const prisma = require("../config/database");

const createApplication = async (data) => {
  const { candidateId, requisitionId } = data;

  if (
    typeof candidateId !== "string" ||
    !candidateId.trim() ||
    typeof requisitionId !== "string" ||
    !requisitionId.trim()
  ) {
    const error = new Error("Candidate ID and requisition ID are required");
    error.statusCode = 400;
    throw error;
  }

  const candidate = await prisma.candidate.findUnique({
    where: { candidateId },
  });

  if (!candidate) {
    const error = new Error("Candidate not found");
    error.statusCode = 404;
    throw error;
  }

  const requisition = await prisma.requisition.findUnique({
    where: { requisitionId },
  });

  if (!requisition) {
    const error = new Error("Requisition not found");
    error.statusCode = 404;
    throw error;
  }

  if (requisition.status !== "OPEN") {
    const error = new Error(
      "Applications are allowed only for open requisitions",
    );
    error.statusCode = 400;
    throw error;
  }

  const applicationId = `APP-${candidateId}-${requisitionId}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          applicationId,
          candidateId,
          requisitionId,
          currentStage: "APPLIED",
          status: "ACTIVE",
        },
        include: {
          candidate: true,
          requisition: true,
        },
      });

      await tx.applicationStageEvent.create({
        data: {
          applicationId,
          fromStage: null,
          toStage: "APPLIED",
          reason: "Application submitted",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "APPLICATION_CREATED",
          entityType: "Application",
          entityId: applicationId,
          details: {
            candidateId,
            requisitionId,
            stage: "APPLIED",
          },
        },
      });

      return application;
    });
  } catch (error) {
    if (error.code === "P2002") {
      const duplicateError = new Error(
        "This candidate has already applied for this requisition",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

const getAllApplications = async () => {
  return prisma.application.findMany({
    include: {
      candidate: true,
      requisition: true,
      stageEvents: {
        orderBy: { changedAt: "asc" },
      },
    },
    orderBy: {
      appliedAt: "desc",
    },
  });
};

const getApplicationById = async (applicationId) => {
  const application = await prisma.application.findUnique({
    where: { applicationId },
    include: {
      candidate: true,
      requisition: true,
      interviews: true,
      offers: true,
      stageEvents: {
        orderBy: { changedAt: "asc" },
      },
    },
  });

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  return application;
};

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationById,
};
