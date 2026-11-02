const prisma = require("../../src/config/database");
const { createRandom } = require("./random");

const { completeInterview } = require("../../src/services/interviewService");

const { createScorecard } = require("../../src/services/scorecardService");

const random = createRandom(20261022);

const generateScorecards = async () => {
  const interviews = await prisma.interview.findMany({
    where: {
      interviewType: "SCREENING",
      status: { in: ["SCHEDULED", "COMPLETED"] },
      application: {
        is: {
          candidateId: { startsWith: "SYN-CAND-" },
          requisitionId: { startsWith: "REQ-2026-9" },
        },
      },
    },
    include: {
      application: true,
      participants: true,
    },
    orderBy: {
      interviewId: "asc",
    },
  });

  const existingScorecards = await prisma.scorecard.findMany({
    select: {
      interviewId: true,
    },
  });

  const scoredInterviewIds = new Set(
    existingScorecards.map((item) => item.interviewId),
  );

  const requisitionIds = [
    ...new Set(
      interviews.map((interview) => interview.application.requisitionId),
    ),
  ];

  const criteria = await prisma.evaluationCriterion.findMany({
    where: {
      requisitionId: { in: requisitionIds },
      isActive: true,
    },
  });

  const criteriaMap = new Map();

  for (const criterion of criteria) {
    if (!criteriaMap.has(criterion.requisitionId)) {
      criteriaMap.set(criterion.requisitionId, []);
    }

    criteriaMap.get(criterion.requisitionId).push(criterion);
  }

  let completed = 0;
  let scorecardsCreated = 0;
  let skipped = 0;

  for (const interview of interviews) {
    if (scoredInterviewIds.has(interview.interviewId)) {
      skipped++;
      continue;
    }

    const lead = interview.participants.find(
      (participant) => participant.role === "LEAD",
    );

    if (!lead) {
      throw new Error(`No lead interviewer: ${interview.interviewId}`);
    }

    const interviewCriteria =
      criteriaMap.get(interview.application.requisitionId) || [];

    if (interviewCriteria.length === 0) {
      throw new Error(
        `No active criteria for ${interview.application.requisitionId}`,
      );
    }

    if (interview.status === "SCHEDULED") {
      await completeInterview(interview.interviewId, {
        completedById: lead.employeeId,
      });

      completed++;
    }

    const items = interviewCriteria.map((criterion) => ({
      criterionId: criterion.criterionId,
      score: random.integer(4, 10),
      comments: `Synthetic evaluation for ${criterion.name}`,
    }));

    const averageScore =
      items.reduce((sum, item) => sum + item.score, 0) / items.length;

    const categoryScore = Number(averageScore.toFixed(2));

    await createScorecard({
      interviewId: interview.interviewId,
      reviewerId: lead.employeeId,
      technicalScore: categoryScore,
      communicationScore: categoryScore,
      problemSolvingScore: categoryScore,
      comments: "Synthetic screening interview evaluation",
      items,
    });

    scorecardsCreated++;

    if (scorecardsCreated % 100 === 0) {
      console.log(
        `Scorecards created: ${scorecardsCreated}/${interviews.length}`,
      );
    }
  }

  console.log("--------------------------------");
  console.log(`Interviews completed: ${completed}`);
  console.log(`Scorecards created: ${scorecardsCreated}`);
  console.log(`Already processed: ${skipped}`);
};

generateScorecards()
  .catch((error) => {
    console.error("Generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
