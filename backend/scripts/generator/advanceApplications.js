const prisma = require("../../src/config/database");
const { updateApplicationStage } = require("../../src/services/applicationStageService");

const advanceApplications = async () => {
  const applications = await prisma.application.findMany({
    where: {
      currentStage: "APPLIED",
      status: "ACTIVE",
      candidateId: { startsWith: "SYN-CAND-" },
      requisitionId: { startsWith: "REQ-2026-9" },
    },
    take: 2000,
    orderBy: { applicationId: "asc" },
  });

  const hrEmployee = await prisma.employee.findFirst({
    where: {
      role: "HR",
      isActive: true,
      employeeId: { startsWith: "SYN-EMP-" },
    },
  });

  if (!hrEmployee) {
    throw new Error("No synthetic HR employee found.");
  }

  let updated = 0;

  for (const application of applications) {
    await updateApplicationStage(application.applicationId, {
      toStage: "SCREENING",
      changedById: hrEmployee.employeeId,
      reason: "Synthetic candidate selected for initial screening",
    });

    updated++;

    if (updated % 500 === 0) {
      console.log(`Advanced ${updated}/2000 applications`);
    }
  }

  console.log(`Applications advanced to SCREENING: ${updated}`);
};

advanceApplications()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });