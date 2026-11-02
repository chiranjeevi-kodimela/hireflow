const prisma = require("../config/database");

const createScorecard = async (data) => {
  const {
    interviewId,
    reviewerId,
    technicalScore,
    communicationScore,
    problemSolvingScore,
    comments,
    items,
  } = data;

  if (
    !interviewId ||
    !reviewerId ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    const error = new Error("Interview, reviewer and evaluation items are required");
    error.statusCode = 400;
    throw error;
  }

  const scores = [technicalScore, communicationScore, problemSolvingScore];

  if (
    scores.some(
      (score) =>
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 10
    )
  ) {
    const error = new Error("All category scores must be between 0 and 10");
    error.statusCode = 400;
    throw error;
  }

  const criterionIds = items.map((item) => item.criterionId);

  if (
    items.some(
      (item) =>
        !item.criterionId ||
        typeof item.score !== "number" ||
        !Number.isFinite(item.score) ||
        item.score < 0 ||
        item.score > 10
    ) ||
    new Set(criterionIds).size !== criterionIds.length
  ) {
    const error = new Error("Invalid or duplicate evaluation criteria or scores");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findUnique({
      where: { interviewId },
      include: {
        participants: true,
        application: true,
      },
    });

    if (!interview || interview.status !== "COMPLETED") {
      const error = new Error("Only completed interviews can be evaluated");
      error.statusCode = 400;
      throw error;
    }

    const isReviewer = interview.participants.some(
      (participant) =>
        participant.employeeId === reviewerId &&
        participant.role !== "OBSERVER"
    );

    if (!isReviewer) {
      const error = new Error("Reviewer must be an assigned interviewer");
      error.statusCode = 403;
      throw error;
    }

    const criteria = await tx.evaluationCriterion.findMany({
      where: {
        requisitionId: interview.application.requisitionId,
        isActive: true,
      },
    });

    if (criteria.length === 0) {
      const error = new Error("No active evaluation criteria configured for this requisition");
      error.statusCode = 400;
      throw error;
    }

    const criteriaMap = new Map(
      criteria.map((criterion) => [criterion.criterionId, criterion])
    );

    for (const item of items) {
      if (!criteriaMap.has(item.criterionId)) {
        const error = new Error("Evaluation contains an irrelevant or inactive criterion");
        error.statusCode = 400;
        throw error;
      }
    }

    const submittedIds = new Set(criterionIds);

    const missingRequired = criteria.filter(
      (criterion) =>
        criterion.isRequired && !submittedIds.has(criterion.criterionId)
    );

    if (missingRequired.length > 0) {
      const error = new Error(
        `Missing required criteria: ${missingRequired.map((c) => c.name).join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }

    const totalWeight = items.reduce(
      (sum, item) => sum + Number(criteriaMap.get(item.criterionId).weight),
      0
    );

    if (totalWeight <= 0) {
      const error = new Error("Evaluation criteria must have positive total weight");
      error.statusCode = 400;
      throw error;
    }

    const weightedScore =
      items.reduce(
        (sum, item) =>
          sum +
          item.score * Number(criteriaMap.get(item.criterionId).weight),
        0
      ) / totalWeight;

    let recommendation;

    if (weightedScore >= 8) recommendation = "STRONG_YES";
    else if (weightedScore >= 7) recommendation = "YES";
    else if (weightedScore >= 5) recommendation = "MAYBE";
    else if (weightedScore >= 3) recommendation = "NO";
    else recommendation = "STRONG_NO";

    const scorecardId = `SCORE-${interviewId}-${reviewerId}`;

    const scorecard = await tx.scorecard.create({
      data: {
        scorecardId,
        interviewId,
        reviewerId,
        technicalScore,
        communicationScore,
        problemSolvingScore,
        recommendation,
        comments: comments || null,
        items: {
          create: items.map((item) => ({
            criterionId: item.criterionId,
            score: item.score,
            comments: item.comments || null,
          })),
        },
      },
      include: {
        items: {
          include: { criterion: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "SCORECARD_SUBMITTED",
        entityType: "Scorecard",
        entityId: scorecardId,
        details: {
          interviewId,
          weightedScore: Number(weightedScore.toFixed(2)),
          recommendation,
        },
      },
    });

    return {
      ...scorecard,
      weightedScore: Number(weightedScore.toFixed(2)),
    };
  });
};

module.exports = { createScorecard };