const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const { createInterview } = require("../../src/services/interviewService");

const random = createRandom(20261022);

const generateTimeSlots = () => {
  const slots = [];
  const hours = [9, 10, 11, 13, 14, 15];

  let date = new Date("2026-11-03T00:00:00.000Z");
  let workingDays = 0;

  while (workingDays < 40) {
    const day = date.getUTCDay();

    if (day !== 0 && day !== 6) {
      const dateKey = date.toISOString().slice(0, 10);

      for (const hour of hours) {
        const startTime = new Date(
          `${dateKey}T${String(hour).padStart(2, "0")}:00:00.000Z`,
        );

        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        slots.push({ startTime, endTime });
      }

      workingDays++;
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return slots;
};

const generateInterviews = async () => {
  const applications = await prisma.application.findMany({
    where: {
      currentStage: "SCREENING",
      status: "ACTIVE",
      candidateId: { startsWith: "SYN-CAND-" },
      requisitionId: { startsWith: "REQ-2026-9" },
    },
    select: {
      applicationId: true,
      requisitionId: true,
    },
    orderBy: {
      applicationId: "asc",
    },
    take: 2000,
  });

  const requisitionIds = [
    ...new Set(applications.map((app) => app.requisitionId)),
  ];

  const panels = await prisma.interviewPanel.findMany({
    where: {
      requisitionId: { in: requisitionIds },
      isActive: true,
    },
    include: {
      members: {
        select: {
          employeeId: true,
        },
      },
    },
  });

  const panelMap = new Map(panels.map((panel) => [panel.requisitionId, panel]));

  const existingInterviews = await prisma.interview.findMany({
    where: {
      applicationId: {
        in: applications.map((app) => app.applicationId),
      },
      interviewType: "SCREENING",
    },
    select: {
      applicationId: true,
    },
  });

  const existingApplicationIds = new Set(
    existingInterviews.map((item) => item.applicationId),
  );

  const timeSlots = generateTimeSlots();

  let generated = 0;
  let skipped = 0;

  for (const application of applications) {
    if (existingApplicationIds.has(application.applicationId)) {
      skipped++;
      continue;
    }

    const panel = panelMap.get(application.requisitionId);

    if (!panel || panel.members.length < 2) {
      skipped++;
      continue;
    }

    const members = random.shuffle(panel.members);
    const pairs = [];

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        pairs.push([
          { employeeId: members[i].employeeId, role: "LEAD" },
          { employeeId: members[j].employeeId, role: "PANELIST" },
        ]);
      }
    }

    let scheduled = false;

    for (const slot of random.shuffle(timeSlots)) {
      for (const participants of random.shuffle(pairs)) {
        try {
          await createInterview({
            applicationId: application.applicationId,
            panelId: panel.panelId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            interviewType: "SCREENING",
            participants,
          });

          generated++;
          scheduled = true;
          break;
        } catch (error) {
          if (error.statusCode === 409 || error.code === "P2034") {
            continue;
          }

          throw error;
        }
      }

      if (scheduled) break;
    }

    if (!scheduled) {
      throw new Error(
        `Could not schedule interview for ${application.applicationId}. Generated ${generated} so far.`,
      );
    }

    if (generated % 100 === 0) {
      console.log(`Generated ${generated}/2000 interviews`);
    }
  }

  console.log("--------------------------------");
  console.log(`Interviews generated: ${generated}`);
  console.log(`Applications skipped: ${skipped}`);
};

generateInterviews()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
