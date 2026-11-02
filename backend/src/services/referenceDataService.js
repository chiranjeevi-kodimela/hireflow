const prisma = require("../config/database");

const getEmployees = async () => {
  return prisma.employee.findMany({
    where: {
      isActive: true,
      role: {
        in: ["INTERVIEWER", "HIRING_MANAGER", "HR", "ADMIN", "APPROVER"],
      },
    },
    select: {
      employeeId: true,
      fullName: true,
      email: true,
      department: true,
      role: true,
      isActive: true,
    },
    orderBy: { fullName: "asc" },
  });
};

const getInterviewPanels = async (requisitionId) => {
  return prisma.interviewPanel.findMany({
    where: {
      isActive: true,
      ...(requisitionId && { requisitionId }),
    },
    include: {
      requisition: {
        select: {
          requisitionId: true,
          title: true,
          department: true,
        },
      },
      members: {
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
              email: true,
              department: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: { panelName: "asc" },
  });
};

const getEvaluationCriteria = async (requisitionId) => {
  if (!requisitionId) {
    const error = new Error("requisitionId is required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.evaluationCriterion.findMany({
    where: {
      requisitionId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
};

module.exports = {
  getEmployees,
  getInterviewPanels,
  getEvaluationCriteria,
};
