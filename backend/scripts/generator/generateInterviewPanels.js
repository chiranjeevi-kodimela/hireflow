const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const config = require("./config");

const random = createRandom(config.seed);

const generatePanels = async () => {
  const requisitions = await prisma.requisition.findMany({
    where: {
      requisitionId: { startsWith: "REQ-2026-" },
      status: "OPEN",
    },
    orderBy: { requisitionId: "asc" },
  });

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: {
        in: ["INTERVIEWER", "HIRING_MANAGER", "HR", "OPERATIONS"],
      },
    },
    orderBy: { employeeId: "asc" },
  });

  if (employees.length < 3) {
    throw new Error("Not enough active interviewers to create panels.");
  }

  let panelCount = 0;
  let memberCount = 0;

  for (const requisition of requisitions) {
    const panel = await prisma.interviewPanel.upsert({
      where: {
        panelId: `SYN-PANEL-${requisition.requisitionId}`,
      },
      update: {},
      create: {
        panelId: `SYN-PANEL-${requisition.requisitionId}`,
        requisitionId: requisition.requisitionId,
        panelName: `${requisition.title} Interview Panel`,
        description: `Synthetic interview panel for ${requisition.title}`,
        isActive: true,
      },
    });

    panelCount++;

    const selectedEmployees = random.shuffle(employees).slice(0, 3);

    for (const employee of selectedEmployees) {
      const existing = await prisma.panelMember.findFirst({
        where: {
          panelId: panel.panelId,
          employeeId: employee.employeeId,
        },
      });

      if (!existing) {
        await prisma.panelMember.create({
          data: {
            panelMemberId: `SYN-PM-${panel.panelId}-${employee.employeeId}`,
            panelId: panel.panelId,
            employeeId: employee.employeeId,
          },
        });

        memberCount++;
      }
    }
  }

  console.log(`Interview panels generated: ${panelCount}`);
  console.log(`Panel memberships generated: ${memberCount}`);
};

generatePanels()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
