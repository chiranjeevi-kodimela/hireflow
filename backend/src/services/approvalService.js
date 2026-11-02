const prisma = require("../config/database");

const decideApproval = async (approvalId, data) => {
  const { approverId, decision, comments } = data;

  if (
    !approvalId ||
    !approverId ||
    !["APPROVED", "REJECTED"].includes(decision)
  ) {
    const error = new Error(
      "Valid approval ID, approver ID and decision are required",
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const approval = await tx.approval.findUnique({
      where: { approvalId },
      include: { offer: true },
    });

    if (!approval || approval.approvalType !== "OFFER" || !approval.offer) {
      const error = new Error("Offer approval not found");
      error.statusCode = 404;
      throw error;
    }

    if (approval.approverId !== approverId) {
      const error = new Error("You are not authorized for this approval");
      error.statusCode = 403;
      throw error;
    }

    if (approval.status !== "PENDING") {
      const error = new Error("This approval has already been decided");
      error.statusCode = 409;
      throw error;
    }

    if (approval.offer.status !== "PENDING_APPROVAL") {
      const error = new Error("Offer is no longer awaiting approval");
      error.statusCode = 409;
      throw error;
    }

    const result = await tx.approval.updateMany({
      where: { approvalId, status: "PENDING" },
      data: {
        status: decision,
        comments: comments || null,
        decidedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      const error = new Error("Approval was already updated");
      error.statusCode = 409;
      throw error;
    }

    if (decision === "REJECTED") {
      await tx.approval.updateMany({
        where: {
          offerId: approval.offerId,
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          comments: "Offer rejected by another approver",
          decidedAt: new Date(),
        },
      });

      await tx.offer.update({
        where: { offerId: approval.offerId },
        data: { status: "REJECTED" },
      });
    } else {
      const pendingCount = await tx.approval.count({
        where: {
          offerId: approval.offerId,
          status: "PENDING",
        },
      });

      if (pendingCount === 0) {
        await tx.offer.update({
          where: { offerId: approval.offerId },
          data: { status: "APPROVED" },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: approverId,
        action: `OFFER_${decision}`,
        entityType: "Offer",
        entityId: approval.offerId,
        details: { approvalId, decision, comments: comments || null },
      },
    });

    return tx.offer.findUnique({
      where: { offerId: approval.offerId },
      include: { approvals: true },
    });
  });
};

module.exports = { decideApproval };
