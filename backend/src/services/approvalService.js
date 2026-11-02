const prisma = require("../config/database");

const decideApproval = async (approvalId, data) => {
  const { approverId, decision, comments } = data;

  if (!approverId || !["APPROVED", "REJECTED"].includes(decision)) {
    const error = new Error("Valid approver ID and decision are required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { approvalId },
    });

    if (!approval) {
      const error = new Error("Approval not found");
      error.statusCode = 404;
      throw error;
    }

    if (approval.approverId !== approverId) {
      const error = new Error("You are not authorized for this approval");
      error.statusCode = 403;
      throw error;
    }

    if (approval.status !== "PENDING") {
      const error = new Error("Approval has already been decided");
      error.statusCode = 409;
      throw error;
    }

    const update = await tx.approval.updateMany({
      where: { approvalId, status: "PENDING" },
      data: {
        status: decision,
        comments: comments || null,
        decidedAt: new Date(),
      },
    });

    if (update.count !== 1) {
      const error = new Error("Approval was already updated");
      error.statusCode = 409;
      throw error;
    }

    let entityId;
    let newStatus;

    if (approval.approvalType === "OFFER" && approval.offerId) {
      entityId = approval.offerId;

      const offer = await tx.offer.findUnique({
        where: { offerId: entityId },
      });

      if (!offer || offer.status !== "PENDING_APPROVAL") {
        const error = new Error("Offer is not awaiting approval");
        error.statusCode = 409;
        throw error;
      }

      if (decision === "REJECTED") {
        await tx.approval.updateMany({
          where: { offerId: entityId, status: "PENDING" },
          data: {
            status: "REJECTED",
            comments: "Offer rejected by another approver",
            decidedAt: new Date(),
          },
        });

        newStatus = "REJECTED";
      } else {
        const pending = await tx.approval.count({
          where: { offerId: entityId, status: "PENDING" },
        });

        newStatus = pending === 0 ? "APPROVED" : "PENDING_APPROVAL";
      }

      if (newStatus !== "PENDING_APPROVAL") {
        await tx.offer.update({
          where: { offerId: entityId },
          data: { status: newStatus },
        });
      }
    } else if (
      approval.approvalType === "REQUISITION" &&
      approval.requisitionId
    ) {
      entityId = approval.requisitionId;

      const requisition = await tx.requisition.findUnique({
        where: { requisitionId: entityId },
      });

      if (!requisition || requisition.status !== "PENDING_APPROVAL") {
        const error = new Error("Requisition is not awaiting approval");
        error.statusCode = 409;
        throw error;
      }

      if (decision === "REJECTED") {
        await tx.approval.updateMany({
          where: {
            requisitionId: entityId,
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
            comments: "Requisition rejected by another approver",
            decidedAt: new Date(),
          },
        });

        newStatus = "DRAFT";
      } else {
        const pending = await tx.approval.count({
          where: {
            requisitionId: entityId,
            status: "PENDING",
          },
        });

        newStatus = pending === 0 ? "OPEN" : "PENDING_APPROVAL";
      }

      if (newStatus !== "PENDING_APPROVAL") {
        await tx.requisition.update({
          where: { requisitionId: entityId },
          data: { status: newStatus },
        });
      }
    } else {
      const error = new Error("Unsupported approval type");
      error.statusCode = 400;
      throw error;
    }

    await tx.auditLog.create({
      data: {
        actorId: approverId,
        action: `${approval.approvalType}_${decision}`,
        entityType: approval.approvalType === "OFFER" ? "Offer" : "Requisition",
        entityId,
        details: { approvalId, decision, newStatus },
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
