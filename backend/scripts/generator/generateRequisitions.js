const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const config = require("./config");

const random = createRandom(config.seed);

const titles = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Analyst",
  "Data Engineer",
  "DevOps Engineer",
  "QA Engineer",
  "Product Analyst",
  "Machine Learning Engineer",
];

const departments = [
  "Engineering",
  "Product",
  "Data",
  "Finance",
  "Human Resources",
];

const locations = [
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Pune",
  "Mumbai",
  "Remote",
];

const employmentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

const generateRequisitions = async () => {
  const managers = await prisma.hiringManager.findMany({
    where: { isActive: true },
    orderBy: { hiringManagerId: "asc" },
  });

  if (managers.length === 0) {
    throw new Error(
      "No active hiring managers found. Generate employees first.",
    );
  }

  let generated = 0;

  for (let i = 1; i <= config.requisitions; i++) {
    const minSalary = random.integer(300000, 1200000);
    const maxSalary = minSalary + random.integer(200000, 800000);

    const requisitionId = `REQ-2026-${String(i).padStart(6, "0")}`;

    await prisma.requisition.upsert({
      where: { requisitionId },
      update: {},
      create: {
        requisitionId,
        title: random.pick(titles),
        department: random.pick(departments),
        location: random.pick(locations),
        employmentType: random.pick(employmentTypes),
        minSalary,
        maxSalary,
        openings: random.integer(1, 5),
        hiringManagerId: random.pick(managers).hiringManagerId,
        status: "DRAFT",
      },
    });

    generated++;
  }

  console.log(`Requisitions generated: ${generated}`);
};

generateRequisitions()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
