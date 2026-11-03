const prisma = require("../config/database");

const submitRequisition = async (requisitionId, submittedById) => {
  if (!requisitionId || !submittedById) {
    const error = new Error("Requisition ID and employee ID are required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const requisition = await tx.requisition.findUnique({
      where: { requisitionId },
      include: { hiringManager: true },
    });

    if (!requisition || requisition.status !== "DRAFT") {
      const error = new Error("Only draft requisitions can be submitted");
      error.statusCode = 400;
      throw error;
    }

    if (requisition.hiringManager.employeeId !== submittedById) {
      const error = new Error(
        "Only the assigned hiring manager can submit this requisition",
      );
      error.statusCode = 403;
      throw error;
    }

    const approvers = await tx.employee.findMany({
      where: { role: "APPROVER", isActive: true },
      orderBy: { employeeId: "asc" },
    });

    if (approvers.length === 0) {
      const error = new Error("No active approvers configured");
      error.statusCode = 400;
      throw error;
    }

    await tx.requisition.update({
      where: { requisitionId },
      data: { status: "PENDING_APPROVAL" },
    });

    await tx.approval.createMany({
      data: approvers.map((approver) => ({
        approvalId: `APR-REQ-${requisitionId}-${approver.employeeId}`,
        requisitionId,
        approverId: approver.employeeId,
        approvalType: "REQUISITION",
        status: "PENDING",
      })),
    });

    await tx.auditLog.create({
      data: {
        actorId: submittedById,
        action: "REQUISITION_SUBMITTED",
        entityType: "Requisition",
        entityId: requisitionId,
        details: { approverCount: approvers.length },
      },
    });

    return tx.requisition.findUnique({
      where: { requisitionId },
      include: { approvals: true },
    });
  });
};

module.exports = { submitRequisition };
