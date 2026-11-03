const prisma = require("../../src/config/database");
const { createRandom } = require("./random");
const config = require("./config");
const { completeInterview } = require("../../src/services/interviewService");
const { submitInterviewScorecards } = require("./scorecardGenerator");

const random = createRandom(config.seed);

const generateScorecards = async () => {
  const interviews = await prisma.interview.findMany({
    where: {
      status: { in: ["SCHEDULED", "COMPLETED"] },
      application: {
        is: {
          candidateId: { startsWith: "CAND-" },
          requisitionId: { startsWith: "REQ-2026-" },
        },
      },
    },
    include: {
      application: true,
      participants: true,
      scorecards: { select: { reviewerId: true } },
    },
    orderBy: { interviewId: "asc" },
  });

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
    orderBy: { criterionId: "asc" },
  });
  const criteriaByRequisition = new Map();

  for (const criterion of criteria) {
    const items = criteriaByRequisition.get(criterion.requisitionId) || [];
    items.push(criterion);
    criteriaByRequisition.set(criterion.requisitionId, items);
  }

  const firstInterviewId = interviews[0]?.interviewId;
  const omitIncompleteReviewer =
    process.env.HIRE_FLOW_INCLUDE_INCOMPLETE_SCORECARD !== "false";
  let scorecardsCreated = 0;
  let completed = 0;
  let incompleteFixtureCreated = false;

  for (const interview of interviews) {
    const interviewCriteria =
      criteriaByRequisition.get(interview.application.requisitionId) || [];
    if (interviewCriteria.length === 0) {
      throw new Error(
        `No active criteria for ${interview.application.requisitionId}`,
      );
    }

    if (interview.status === "SCHEDULED") {
      const lead = interview.participants.find(
        (participant) => participant.role === "LEAD",
      );
      if (!lead) throw new Error(`No lead interviewer: ${interview.interviewId}`);

      await completeInterview(interview.interviewId, {
        completedById: lead.employeeId,
      });
      completed++;
    }

    const excludedReviewer =
      omitIncompleteReviewer &&
      interview.interviewId === firstInterviewId &&
      !incompleteFixtureCreated
        ? interview.participants.find(
            (participant) => participant.role === "PANELIST",
          )?.employeeId
        : undefined;
    const created = await submitInterviewScorecards(
      interview,
      interviewCriteria,
      random,
      excludedReviewer ? [excludedReviewer] : [],
    );
    scorecardsCreated += created;

    if (excludedReviewer) incompleteFixtureCreated = true;

    if (scorecardsCreated > 0 && scorecardsCreated % 100 === 0) {
      console.log(
        `Scorecards created: ${scorecardsCreated}/${interviews.length}`,
      );
    }
  }

  if (omitIncompleteReviewer && !incompleteFixtureCreated && interviews.length) {
    throw new Error("Could not create the incomplete scorecard fixture.");
  }

  console.log("--------------------------------");
  console.log(`Interviews completed: ${completed}`);
  console.log(`Scorecards created: ${scorecardsCreated}`);
  console.log(
    `Incomplete scorecard fixture: ${incompleteFixtureCreated ? "included" : "disabled"}`,
  );
};

generateScorecards()
  .catch((error) => {
    console.error("Generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
