
const prisma = require("../config/database");

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const decideApproval = async (approvalId, data) => {
  const { approverId, decision, comments } = data;

  if (!approverId || !["APPROVED", "REJECTED"].includes(decision)) {
    fail("Valid approver ID and decision are required", 400);
  }

  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { approvalId },
    });

    if (!approval) fail("Approval not found", 404);

    if (approval.approverId !== approverId) {
      fail("You are not authorized for this approval", 403);
    }

    const employee = await tx.employee.findUnique({
      where: { employeeId: approverId },
      select: {
        employeeId: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !employee ||
      !employee.isActive ||
      employee.role !== "APPROVER"
    ) {
      fail("An active assigned approver is required", 403);
    }

    if (approval.status !== "PENDING") {
      fail("Approval has already been decided", 409);
    }

    let entityId;
    let newStatus;
    let entityType;

    if (approval.approvalType === "OFFER" && approval.offerId) {
      entityId = approval.offerId;
      entityType = "Offer";

      const offer = await tx.offer.findUnique({
        where: { offerId: entityId },
      });

      if (!offer || offer.status !== "PENDING_APPROVAL") {
        fail("Offer is not awaiting approval", 409);
      }
    } else if (
      approval.approvalType === "REQUISITION" &&
      approval.requisitionId
    ) {
      entityId = approval.requisitionId;
      entityType = "Requisition";

      const requisition = await tx.requisition.findUnique({
        where: { requisitionId: entityId },
      });

      if (!requisition || requisition.status !== "PENDING_APPROVAL") {
        fail("Requisition is not awaiting approval", 409);
      }
    } else {
      fail("Unsupported approval type", 400);
    }

    const update = await tx.approval.updateMany({
      where: {
        approvalId,
        approverId,
        status: "PENDING",
      },
      data: {
        status: decision,
        comments: comments?.trim() || null,
        decidedAt: new Date(),
      },
    });

    if (update.count !== 1) {
      fail("Approval was already updated", 409);
    }

    if (decision === "REJECTED") {
      await tx.approval.updateMany({
        where: {
          ...(approval.approvalType === "OFFER"
            ? { offerId: entityId }
            : { requisitionId: entityId }),
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          comments: "Closed because another approver rejected this request",
          decidedAt: new Date(),
        },
      });

      newStatus =
        approval.approvalType === "OFFER" ? "REJECTED" : "DRAFT";
    } else {
      const pending = await tx.approval.count({
        where: {
          ...(approval.approvalType === "OFFER"
            ? { offerId: entityId }
            : { requisitionId: entityId }),
          status: "PENDING",
        },
      });

      newStatus =
        pending === 0
          ? approval.approvalType === "OFFER"
            ? "APPROVED"
            : "OPEN"
          : "PENDING_APPROVAL";
    }

    if (approval.approvalType === "OFFER") {
      if (newStatus !== "PENDING_APPROVAL") {
        await tx.offer.update({
          where: { offerId: entityId },
          data: { status: newStatus },
        });
      }
    } else if (newStatus !== "PENDING_APPROVAL") {
      await tx.requisition.update({
        where: { requisitionId: entityId },
        data: { status: newStatus },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: approverId,
        action: `${approval.approvalType}_${decision}`,
        entityType,
        entityId,
        details: {
          approvalId,
          decision,
          comments: comments?.trim() || null,
          newStatus,
        },
      },
    });

    if (approval.approvalType === "OFFER") {
      return tx.offer.findUnique({
        where: { offerId: entityId },
        include: { approvals: true },
      });
    }

    return tx.requisition.findUnique({
      where: { requisitionId: entityId },
      include: { approvals: true },
    });
  });
};

module.exports = { decideApproval };
