const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const config = require("./config");
const { createApplication } = require("../../src/services/applicationService");

const random = createRandom(config.seed);

const generateApplications = async () => {
  const candidates = await prisma.candidate.findMany({
    where: {
      candidateId: { startsWith: "CAND-" },
    },
    orderBy: { candidateId: "asc" },
    select: { candidateId: true },
  });

  const requisitions = await prisma.requisition.findMany({
    where: {
      requisitionId: { startsWith: "REQ-2026-" },
      status: "OPEN",
    },
    orderBy: { requisitionId: "asc" },
    select: { requisitionId: true },
  });

  if (
    candidates.length < config.candidates ||
    requisitions.length === 0 ||
    config.applications > candidates.length * requisitions.length
  ) {
    throw new Error(
      `Generate at least ${config.candidates} candidates and approve enough synthetic requisitions first.`,
    );
  }

  const pairs = new Set();

  while (pairs.size < config.applications) {
    const candidate = random.pick(candidates);
    const requisition = random.pick(requisitions);

    pairs.add(`${candidate.candidateId}|${requisition.requisitionId}`);
  }

  const applications = Array.from(pairs).map((pair) => {
    const [candidateId, requisitionId] = pair.split("|");

    return { candidateId, requisitionId };
  });

  let generated = 0;

  for (let i = 0; i < applications.length; i++) {
    const application = applications[i];

    try {
      await createApplication(application);
      generated++;
    } catch (error) {
      if (error.statusCode === 409 || error.code === "P2002") {
        // Skip an application that already exists.
        continue;
      }

      throw error;
    }

    if ((i + 1) % 500 === 0 || i + 1 === applications.length) {
      console.log(
        `Processed ${i + 1}/${config.applications} applications`,
      );
    }
  }

  console.log(`New applications generated: ${generated}`);
};

generateApplications()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
