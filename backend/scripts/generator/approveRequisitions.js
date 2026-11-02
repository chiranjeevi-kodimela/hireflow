const prisma = require("../../src/config/database");

const {
  submitRequisition,
} = require("../../src/services/requisitionApprovalService");

const { decideApproval } = require("../../src/services/approvalService");

const approveRequisitions = async () => {
  const requisitions = await prisma.requisition.findMany({
    where: {
      requisitionId: {
        startsWith: "REQ-2026-",
      },
    },
    include: {
      hiringManager: true,
    },
    orderBy: {
      requisitionId: "asc",
    },
  });

  console.log(`Found ${requisitions.length} synthetic requisitions`);

  let approvedCount = 0;

  for (const requisition of requisitions) {
    if (requisition.status === "DRAFT") {
      await submitRequisition(
        requisition.requisitionId,
        requisition.hiringManager.employeeId,
      );
    }

    const pendingApprovals = await prisma.approval.findMany({
      where: {
        requisitionId: requisition.requisitionId,
        approvalType: "REQUISITION",
        status: "PENDING",
      },
    });

    for (const approval of pendingApprovals) {
      await decideApproval(approval.approvalId, {
        approverId: approval.approverId,
        decision: "APPROVED",
      });
    }

    const updated = await prisma.requisition.findUnique({
      where: {
        requisitionId: requisition.requisitionId,
      },
      select: {
        status: true,
      },
    });

    if (updated.status === "OPEN") {
      approvedCount++;
    }
  }

  console.log(`Approved requisitions: ${approvedCount}`);
};

approveRequisitions()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
