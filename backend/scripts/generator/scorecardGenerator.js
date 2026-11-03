const { createScorecard } = require("../../src/services/scorecardService");

const submitInterviewScorecards = async (
  interview,
  criteria,
  random,
  excludedReviewerIds = [],
) => {
  const excluded = new Set(excludedReviewerIds);
  const submittedReviewerIds = new Set(
    (interview.scorecards || []).map((scorecard) => scorecard.reviewerId),
  );
  let created = 0;

  for (const participant of interview.participants) {
    if (
      participant.role === "OBSERVER" ||
      excluded.has(participant.employeeId) ||
      submittedReviewerIds.has(participant.employeeId)
    ) {
      continue;
    }

    const items = criteria.map((criterion) => ({
      criterionId: criterion.criterionId,
      score: random.integer(4, 10),
      comments: `Synthetic evaluation for ${criterion.name}`,
    }));

    const totalWeight = items.reduce(
      (sum, item) =>
        sum +
        item.score *
          Number(
            criteria.find((criterion) => criterion.criterionId === item.criterionId)
              .weight,
          ),
      0,
    );
    const totalWeightValue = criteria.reduce(
      (sum, criterion) => sum + Number(criterion.weight),
      0,
    );
    const categoryScore = Number(
      (totalWeight / totalWeightValue).toFixed(2),
    );

    await createScorecard({
      interviewId: interview.interviewId,
      reviewerId: participant.employeeId,
      technicalScore: categoryScore,
      communicationScore: categoryScore,
      problemSolvingScore: categoryScore,
      comments: "Synthetic rubric-based interview evaluation",
      items,
    });

    submittedReviewerIds.add(participant.employeeId);
    created++;
  }

  return created;
};

module.exports = { submitInterviewScorecards };
