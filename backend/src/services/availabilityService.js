const prisma = require("../config/database");
const { generateId } = require("../utils/idGenerator");

const createAvailability = async (data) => {
  const { interviewerId, startTime, endTime } = data;

  if (!interviewerId || !startTime || !endTime) {
    const error = new Error(
      "Interviewer ID, start time and end time are required",
    );
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    const error = new Error("Invalid availability date or time range");
    error.statusCode = 400;
    throw error;
  }

  if (start <= new Date()) {
    const error = new Error("Availability must be in the future");
    error.statusCode = 400;
    throw error;
  }

  const interviewer = await prisma.employee.findUnique({
    where: { employeeId: interviewerId },
  });

  if (!interviewer || !interviewer.isActive) {
    const error = new Error("Active interviewer not found");
    error.statusCode = 404;
    throw error;
  }

  if (
    ![
      "INTERVIEWER",
      "HIRING_MANAGER",
      "HR",
      "OPERATIONS",
      "ADMIN",
    ].includes(interviewer.role)
  ) {
    const error = new Error("Employee is not eligible to conduct interviews");
    error.statusCode = 400;
    throw error;
  }

  const conflict = await prisma.availability.findFirst({
    where: {
      interviewerId,
      status: "AVAILABLE",
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) {
    const error = new Error("Availability overlaps an existing time slot");
    error.statusCode = 409;
    throw error;
  }

  return prisma.availability.create({
    data: {
      availabilityId: await generateId("availability", "AVL"),
      interviewerId,
      startTime: start,
      endTime: end,
      status: "AVAILABLE",
    },
  });
};

const getInterviewerAvailability = async (interviewerId) => {
  const interviewer = await prisma.employee.findUnique({
    where: { employeeId: interviewerId },
  });

  if (!interviewer) {
    const error = new Error("Interviewer not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.availability.findMany({
    where: { interviewerId },
    orderBy: { startTime: "asc" },
  });
};

module.exports = {
  createAvailability,
  getInterviewerAvailability,
};
