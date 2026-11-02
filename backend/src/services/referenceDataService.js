const prisma = require("../config/database");

// Get active employees who can participate in interviews
const getEmployees = async () => {
  return prisma.employee.findMany({
    where: {
      isActive: true,
      role: {
        in: ["INTERVIEWER", "HIRING_MANAGER", "HR", "ADMIN"],
      },
    },
    select: {
      employeeId: true,
      fullName: true,
      email: true,
      department: true,
      role: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });
};

// Get active interview panels and their members
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
    orderBy: {
      panelName: "asc",
    },
  });
};

// Get active evaluation criteria for a requisition
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
    orderBy: {
      name: "asc",
    },
  });
};

module.exports = {
  getEmployees,
  getInterviewPanels,
  getEvaluationCriteria,
};
