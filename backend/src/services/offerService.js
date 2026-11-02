const prisma = require("../config/database");
const { generateId } = require("../utils/idGenerator");

const createOffer = async (data) => {
  const { applicationId, baseSalary, bonus } = data;

  if (
    !applicationId ||
    typeof baseSalary !== "number" ||
    !Number.isFinite(baseSalary) ||
    baseSalary <= 0 ||
    (bonus !== undefined &&
      (typeof bonus !== "number" || !Number.isFinite(bonus) || bonus < 0))
  ) {
    const error = new Error("Valid application ID, salary and bonus are required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { applicationId },
      include: { requisition: true },
    });

    if (!application || application.status !== "ACTIVE" ||
        application.currentStage !== "OFFER") {
      const error = new Error("Application must be active and in OFFER stage");
      error.statusCode = 400;
      throw error;
    }

    const requisition = application.requisition;

    if (
      baseSalary < Number(requisition.minSalary) ||
      baseSalary > Number(requisition.maxSalary)
    ) {
      const error = new Error(
        `Base salary must be between ${requisition.minSalary} and ${requisition.maxSalary}`
      );
      error.statusCode = 400;
      throw error;
    }

    const approvers = await tx.employee.findMany({
      where: { role: "APPROVER", isActive: true },
    });

    if (approvers.length === 0) {
      const error = new Error("No active offer approvers configured");
      error.statusCode = 400;
      throw error;
    }

    const existingOffer = await tx.offer.findFirst({
      where: {
        applicationId,
        status: {
          in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"],
        },
      },
    });

    if (existingOffer) {
      const error = new Error("An active offer already exists for this application");
      error.statusCode = 409;
      throw error;
    }

    const offerId = await generateId("offer", "OFF", 2026);

    const offer = await tx.offer.create({
      data: {
        offerId,
        applicationId,
        baseSalary,
        bonus: bonus ?? null,
        currency: "INR",
        status: "PENDING_APPROVAL",
        approvals: {
          create: approvers.map((approver) => ({
            approverId: approver.employeeId,
            approvalType: "OFFER",
            status: "PENDING",
          })),
        },
      },
      include: { approvals: true },
    });

    await tx.auditLog.create({
      data: {
        action: "OFFER_CREATED",
        entityType: "Offer",
        entityId: offerId,
        details: { applicationId, baseSalary, bonus: bonus ?? null },
      },
    });

    return offer;
  });
};

module.exports = { createOffer };