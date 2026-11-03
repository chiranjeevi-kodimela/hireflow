const prisma = require("../../src/config/database");
const config = require("./config");
const { updateApplicationStage } = require("../../src/services/applicationStageService");

const advanceApplications = async () => {
  const applications = await prisma.application.findMany({
    where: {
      currentStage: "APPLIED",
      status: "ACTIVE",
      candidateId: { startsWith: "CAND-" },
      requisitionId: { startsWith: "REQ-2026-" },
    },
    take: config.screeningInterviews,
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

    if (updated % 500 === 0 || updated === applications.length) {
      console.log(
        `Advanced ${updated}/${config.screeningInterviews} applications`,
      );
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