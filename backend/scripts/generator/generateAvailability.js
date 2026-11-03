const prisma = require("../../src/config/database");
const config = require("./config");

const generateAvailability = async () => {
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: {
        in: ["INTERVIEWER", "HIRING_MANAGER", "HR", "OPERATIONS"],
      },
    },
    orderBy: { employeeId: "asc" },
  });

  if (employees.length === 0) {
    throw new Error("No eligible interviewers found.");
  }

  const slots = [];
  const workingHours = [9, 10, 11, 13, 14, 15];

  let currentDate = new Date(`${config.calendarStart}T00:00:00.000Z`);
  let workingDays = 0;

  while (workingDays < 40) {
    const day = currentDate.getUTCDay();

    if (day !== 0 && day !== 6) {
      const dateKey = currentDate.toISOString().slice(0, 10);

      for (const employee of employees) {
        for (const hour of workingHours) {
          const startTime = new Date(
            `${dateKey}T${String(hour).padStart(2, "0")}:00:00.000Z`,
          );

          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

          slots.push({
            availabilityId: `SYN-AVL-${employee.employeeId}-${dateKey}-${hour}`,
            interviewerId: employee.employeeId,
            startTime,
            endTime,
            status: "AVAILABLE",
          });
        }
      }

      workingDays++;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  const result = await prisma.availability.createMany({
    data: slots,
    skipDuplicates: true,
  });

  console.log(`Eligible employees: ${employees.length}`);
  console.log(`Availability slots generated: ${result.count}`);
  console.log(`Total slots prepared: ${slots.length}`);
};

generateAvailability()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
