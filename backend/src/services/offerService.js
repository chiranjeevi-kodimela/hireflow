const prisma = require("../config/database");
const { generateId } = require("../utils/idGenerator");

const ACTIVE_OFFER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
];

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

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
    fail("Valid application ID, salary and bonus are required", 400);
  }

  const offerId = await generateId("offer", "OFF", 2026);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const application = await tx.application.findUnique({
          where: { applicationId },
          include: { requisition: true },
        });

        if (
          !application ||
          application.status !== "ACTIVE" ||
          application.currentStage !== "OFFER"
        ) {
          fail("Application must be active and in OFFER stage", 400);
        }

        const requisition = application.requisition;

        if (
          baseSalary < Number(requisition.minSalary) ||
          baseSalary > Number(requisition.maxSalary)
        ) {
          fail(
            `Base salary must be between ${requisition.minSalary} and ${requisition.maxSalary}`,
            400,
          );
        }

        const existingOffer = await tx.offer.findFirst({
          where: {
            applicationId,
            status: { in: ACTIVE_OFFER_STATUSES },
          },
        });

        if (existingOffer) {
          fail("An active offer already exists for this application", 409);
        }

        const approvers = await tx.employee.findMany({
          where: {
            role: "APPROVER",
            isActive: true,
          },
          orderBy: { employeeId: "asc" },
          select: { employeeId: true },
        });

        if (approvers.length === 0) {
          fail("No active offer approvers configured", 400);
        }

        const versionResult = await tx.offer.aggregate({
          where: { applicationId },
          _max: { version: true },
        });

        const version = (versionResult._max.version || 0) + 1;

        const offer = await tx.offer.create({
          data: {
            offerId,
            applicationId,
            version,
            baseSalary,
            bonus: bonus ?? null,
            currency: "INR",
            status: "PENDING_APPROVAL",
            approvals: {
              create: approvers.map((approver) => ({
                approvalId: `APR-OFF-${offerId}-${approver.employeeId}`,
                approverId: approver.employeeId,
                approvalType: "OFFER",
                status: "PENDING",
              })),
            },
          },
          include: {
            approvals: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "OFFER_CREATED",
            entityType: "Offer",
            entityId: offerId,
            details: {
              applicationId,
              version,
              baseSalary,
              bonus: bonus ?? null,
              currency: "INR",
            },
          },
        });

        return offer;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error.code === "P2002" || error.code === "P2034") {
      fail(
        "Another offer operation was completed concurrently. Refresh and try again.",
        409,
      );
    }

    throw error;
  }
};

const getAllOffers = async () => {
  return prisma.offer.findMany({
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    include: {
      approvals: {
        include: {
          approver: {
            select: {
              employeeId: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      application: {
        include: {
          candidate: true,
          requisition: true,
        },
      },
    },
  });
};

const sendOffer = async (offerId) => {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { offerId },
    });

    if (!offer) fail("Offer not found", 404);

    if (offer.status !== "APPROVED") {
      fail("Only approved offers can be sent", 409);
    }

    const updated = await tx.offer.update({
      where: { offerId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        action: "OFFER_SENT",
        entityType: "Offer",
        entityId: offerId,
        details: {
          previousStatus: offer.status,
          newStatus: "SENT",
        },
      },
    });

    return updated;
  });
};

const respondToOffer = async (offerId, data) => {
  const { decision, comments } = data;

  if (!["ACCEPTED", "REJECTED"].includes(decision)) {
    fail("Decision must be ACCEPTED or REJECTED", 400);
  }

  return prisma.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { offerId },
    });

    if (!offer) fail("Offer not found", 404);

    if (offer.status !== "SENT") {
      fail("Only sent offers can receive a response", 409);
    }

    const updated = await tx.offer.update({
      where: { offerId },
      data: {
        status: decision,
        respondedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        action: `OFFER_${decision}`,
        entityType: "Offer",
        entityId: offerId,
        details: {
          previousStatus: offer.status,
          newStatus: decision,
          comments: comments?.trim() || null,
        },
      },
    });

    return updated;
  });
};

const withdrawOffer = async (offerId, data = {}) => {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({
      where: { offerId },
    });

    if (!offer) fail("Offer not found", 404);

    if (!["APPROVED", "SENT"].includes(offer.status)) {
      fail("Only approved or sent offers can be withdrawn", 409);
    }

    const updated = await tx.offer.update({
      where: { offerId },
      data: { status: "WITHDRAWN" },
    });

    await tx.auditLog.create({
      data: {
        action: "OFFER_WITHDRAWN",
        entityType: "Offer",
        entityId: offerId,
        details: {
          previousStatus: offer.status,
          newStatus: "WITHDRAWN",
          reason: data.reason?.trim() || null,
        },
      },
    });

    return updated;
  });
};

module.exports = {
  createOffer,
  getAllOffers,
  sendOffer,
  respondToOffer,
  withdrawOffer,
};
