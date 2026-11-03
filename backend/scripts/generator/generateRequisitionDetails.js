const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const config = require("./config");

const random = createRandom(config.seed);

const skills = [
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "C++",
  "SQL",
  "PostgreSQL",
  "AWS",
  "Docker",
  "Git",
  "Data Structures",
  "Machine Learning",
  "REST APIs",
  "System Design",
];

const levels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

const criteria = [
  {
    name: "Technical Knowledge",
    description: "Understanding of role-related technical concepts",
    category: "TECHNICAL",
    weight: 35,
  },
  {
    name: "Problem Solving",
    description: "Ability to analyze and solve practical problems",
    category: "TECHNICAL",
    weight: 30,
  },
  {
    name: "Communication",
    description: "Ability to communicate ideas clearly",
    category: "BEHAVIORAL",
    weight: 20,
  },
  {
    name: "Role Knowledge",
    description: "Understanding of responsibilities and role requirements",
    category: "ROLE_FIT",
    weight: 15,
  },
];

const generateDetails = async () => {
  const requisitions = await prisma.requisition.findMany();

  let skillCount = 0;
  let criterionCount = 0;

  for (const requisition of requisitions) {
    const selectedSkills = random
      .shuffle(skills)
      .slice(0, random.integer(3, 5));

    for (const [index, skillName] of selectedSkills.entries()) {
      const existing = await prisma.skillRequirement.findFirst({
        where: {
          requisitionId: requisition.requisitionId,
          skillName,
        },
      });

      if (!existing) {
        await prisma.skillRequirement.create({
          data: {
            skillRequirementId: `SYN-SKILL-${String(skillCount + 1).padStart(6, "0")}`,
            requisitionId: requisition.requisitionId,
            skillName,
            minimumLevel: random.pick(levels),
            isMandatory: index < 2,
            weight: random.integer(10, 40),
          },
        });

        skillCount++;
      }
    }

    for (const criterion of criteria) {
      const existing = await prisma.evaluationCriterion.findFirst({
        where: {
          requisitionId: requisition.requisitionId,
          name: criterion.name,
        },
      });

      if (!existing) {
        await prisma.evaluationCriterion.create({
          data: {
            criterionId: `CRIT-${requisition.requisitionId}-${criterion.name
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "-")}`,
            requisitionId: requisition.requisitionId,
            ...criterion,
            isRequired: true,
            isActive: true,
          },
        });

        criterionCount++;
      }
    }
  }

  console.log(`Skill requirements generated: ${skillCount}`);
  console.log(`Evaluation criteria generated: ${criterionCount}`);
};

generateDetails()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
