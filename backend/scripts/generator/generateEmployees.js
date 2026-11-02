const prisma = require("../../src/config/database");
const { createRandom } = require("./random");

const random = createRandom(20261022);

const departments = [
  "Engineering",
  "Product",
  "Data",
  "Finance",
  "Human Resources",
];

const firstNames = [
  "Aarav", "Vihaan", "Aditya", "Arjun", "Ishaan",
  "Rohan", "Kiran", "Rahul", "Ananya", "Diya",
  "Meera", "Priya", "Sneha", "Aadhya", "Kavya",
];

const lastNames = [
  "Sharma", "Reddy", "Patel", "Kumar", "Rao",
  "Verma", "Gupta", "Nair", "Das", "Mehta",
];

const generateEmployees = async () => {
  const employees = [];

  for (let i = 1; i <= 30; i++) {
    const firstName = random.pick(firstNames);
    const lastName = random.pick(lastNames);

    const role =
      i <= 10
        ? "HIRING_MANAGER"
        : i <= 15
          ? "APPROVER"
          : i <= 27
            ? "INTERVIEWER"
            : "HR";

    const employee = await prisma.employee.upsert({
      where: {
        email: `employee${i}@hireflow.test`,
      },
      update: {},
      create: {
        employeeId: `SYN-EMP-${String(i).padStart(6, "0")}`,
        fullName: `${firstName} ${lastName}`,
        email: `employee${i}@hireflow.test`,
        department: random.pick(departments),
        role,
        isActive: true,
      },
    });

    employees.push(employee);

    if (role === "HIRING_MANAGER") {
      await prisma.hiringManager.upsert({
        where: { employeeId: employee.employeeId },
        update: {},
        create: {
          hiringManagerId: `SYN-HM-${String(i).padStart(6, "0")}`,
          employeeId: employee.employeeId,
          designation: "Engineering Manager",
          isActive: true,
        },
      });
    }
  }

  console.log(`Employees generated: ${employees.length}`);
  console.log("Hiring managers generated: 10");
};

generateEmployees()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });