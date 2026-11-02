const { generateId } = require("../utils/idGenerator");
const prisma = require("../config/database");

const createRequisition = async (data) => {
  const {
    title,
    department,
    location,
    employmentType,
    minSalary,
    maxSalary,
    openings,
    hiringManagerId,
  } = data;

  // Validate required fields
  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof department !== "string" ||
    !department.trim() ||
    typeof location !== "string" ||
    !location.trim() ||
    !employmentType ||
    minSalary === undefined ||
    maxSalary === undefined ||
    openings === undefined ||
    !hiringManagerId
  ) {
    const error = new Error("All requisition fields are required");
    error.statusCode = 400;
    throw error;
  }

  // Validate salary
  const min = Number(minSalary);
  const max = Number(maxSalary);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    const error = new Error("Invalid salary range");
    error.statusCode = 400;
    throw error;
  }

  // Validate openings
  const openingCount = Number(openings);

  if (!Number.isInteger(openingCount) || openingCount <= 0) {
    const error = new Error("Openings must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  // Validate employment type
  const validEmploymentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

  if (!validEmploymentTypes.includes(employmentType)) {
    const error = new Error("Invalid employment type");
    error.statusCode = 400;
    throw error;
  }

  // Verify hiring manager
  const hiringManager = await prisma.hiringManager.findUnique({
    where: { hiringManagerId },
  });

  if (!hiringManager || !hiringManager.isActive) {
    const error = new Error("Hiring manager not found or inactive");
    error.statusCode = 404;
    throw error;
  }

  return prisma.requisition.create({
    data: {
      requisitionId: await generateId("requisition", "REQ", 2026),
      title: title.trim(),
      department: department.trim(),
      location: location.trim(),
      employmentType,
      minSalary: min,
      maxSalary: max,
      openings: openingCount,
      hiringManagerId,
    },
    include: {
      hiringManager: {
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });
};

const getAllRequisitions = async (filters = {}) => {
  const { status, department } = filters;

  const validStatuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "OPEN",
    "ON_HOLD",
    "CLOSED",
    "CANCELLED",
  ];

  if (status && !validStatuses.includes(status)) {
    const error = new Error("Invalid requisition status");
    error.statusCode = 400;
    throw error;
  }

  return prisma.requisition.findMany({
    where: {
      ...(status && { status }),
      ...(department && {
        department: {
          contains: department,
          mode: "insensitive",
        },
      }),
    },
    include: {
      hiringManager: {
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getRequisitionById = async (requisitionId) => {
  const requisition = await prisma.requisition.findUnique({
    where: { requisitionId },
    include: {
      hiringManager: {
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      skillRequirements: true,
    },
  });

  if (!requisition) {
    const error = new Error("Requisition not found");
    error.statusCode = 404;
    throw error;
  }

  return requisition;
};

const updateRequisition = async (requisitionId, data) => {
  const existing = await prisma.requisition.findUnique({
    where: { requisitionId },
  });

  if (!existing) {
    const error = new Error("Requisition not found");
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "title",
    "department",
    "location",
    "employmentType",
    "minSalary",
    "maxSalary",
    "openings",
    "status",
  ];

  const updateData = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    const error = new Error("No valid fields provided");
    error.statusCode = 400;
    throw error;
  }

  const min = Number(updateData.minSalary ?? existing.minSalary);
  const max = Number(updateData.maxSalary ?? existing.maxSalary);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    const error = new Error("Invalid salary range");
    error.statusCode = 400;
    throw error;
  }

  const openingCount = Number(updateData.openings ?? existing.openings);

  if (!Number.isInteger(openingCount) || openingCount <= 0) {
    const error = new Error("Openings must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  const validStatuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "OPEN",
    "ON_HOLD",
    "CLOSED",
    "CANCELLED",
  ];

  if (updateData.status && !validStatuses.includes(updateData.status)) {
    const error = new Error("Invalid requisition status");
    error.statusCode = 400;
    throw error;
  }

  const validEmploymentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

  if (
    updateData.employmentType &&
    !validEmploymentTypes.includes(updateData.employmentType)
  ) {
    const error = new Error("Invalid employment type");
    error.statusCode = 400;
    throw error;
  }

  for (const field of ["title", "department", "location"]) {
    if (updateData[field] !== undefined) {
      if (typeof updateData[field] !== "string" || !updateData[field].trim()) {
        const error = new Error(`${field} cannot be empty`);
        error.statusCode = 400;
        throw error;
      }

      updateData[field] = updateData[field].trim();
    }
  }

  if (updateData.minSalary !== undefined) {
    updateData.minSalary = min;
  }

  if (updateData.maxSalary !== undefined) {
    updateData.maxSalary = max;
  }

  if (updateData.openings !== undefined) {
    updateData.openings = openingCount;
  }

  return prisma.requisition.update({
    where: { requisitionId },
    data: updateData,
    include: {
      hiringManager: {
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
            },
          },
        },
      },
    },
  });
};

module.exports = {
  createRequisition,
  getAllRequisitions,
  getRequisitionById,
  updateRequisition,
};
