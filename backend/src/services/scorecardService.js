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

  const fail = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  };

  if (
    !interviewId ||
    !reviewerId ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    fail("Interview, reviewer and evaluation items are required");
  }

  const categoryScores = [
    technicalScore,
    communicationScore,
    problemSolvingScore,
  ];

  if (
    categoryScores.some(
      (score) =>
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 10,
    )
  ) {
    fail("All category scores must be between 0 and 10");
  }

  const criterionIds = items.map((item) => item.criterionId);

  if (
    items.some(
      (item) =>
        !item.criterionId ||
        typeof item.score !== "number" ||
        !Number.isFinite(item.score) ||
        item.score < 0 ||
        item.score > 10,
    ) ||
    new Set(criterionIds).size !== criterionIds.length
  ) {
    fail("Invalid or duplicate evaluation criteria or scores");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const interview = await tx.interview.findUnique({
        where: { interviewId },
        include: {
          participants: true,
          application: true,
        },
      });

      if (!interview || interview.status !== "COMPLETED") {
        fail("Only completed interviews can be evaluated");
      }

      const isReviewer = interview.participants.some(
        (participant) =>
          participant.employeeId === reviewerId &&
          participant.role !== "OBSERVER",
      );

      if (!isReviewer) {
        fail("Reviewer must be an assigned interviewer", 403);
      }

      const existingScorecard = await tx.scorecard.findFirst({
        where: { interviewId, reviewerId },
      });

      if (existingScorecard) {
        fail(
          "You have already submitted an evaluation for this interview",
          409,
        );
      }

      const criteria = await tx.evaluationCriterion.findMany({
        where: {
          requisitionId: interview.application.requisitionId,
          isActive: true,
        },
      });

      if (criteria.length === 0) {
        fail("No active evaluation criteria configured for this requisition");
      }

      const criteriaMap = new Map(
        criteria.map((criterion) => [criterion.criterionId, criterion]),
      );

      for (const item of items) {
        const criterion = criteriaMap.get(item.criterionId);

        if (!criterion) {
          fail("Evaluation contains an irrelevant or inactive criterion");
        }

        if (Number(criterion.weight) <= 0) {
          fail(`Criterion "${criterion.name}" must have a positive weight`);
        }
      }

      const submittedIds = new Set(criterionIds);

      const missingRequired = criteria.filter(
        (criterion) =>
          criterion.isRequired && !submittedIds.has(criterion.criterionId),
      );

      if (missingRequired.length > 0) {
        fail(
          `Missing required criteria: ${missingRequired
            .map((criterion) => criterion.name)
            .join(", ")}`,
        );
      }

      const totalWeight = items.reduce(
        (sum, item) => sum + Number(criteriaMap.get(item.criterionId).weight),
        0,
      );

      if (totalWeight <= 0) {
        fail("Evaluation criteria must have positive total weight");
      }

      const weightedScore =
        items.reduce(
          (sum, item) =>
            sum + item.score * Number(criteriaMap.get(item.criterionId).weight),
          0,
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
  } catch (error) {
    if (error.code === "P2002") {
      fail(
        "An evaluation has already been submitted by this reviewer for this interview",
        409,
      );
    }

    throw error;
  }
};

module.exports = { createScorecard };
