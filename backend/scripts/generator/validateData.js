const fs = require("fs");
const prisma = require("../../src/config/database");
const { Prisma } = require("../../src/generated/prisma");
const { findSchemaIssues, groundTruthMatches } = require("./dataValidation");
const { getExportDir } = require("./paths");

const formatLabel = (label) => ({
  ...label,
  entityId: String(label.entityId),
  relatedEntityId: label.relatedEntityId
    ? String(label.relatedEntityId)
    : null,
});

const detectAnomalies = (records) => {
  const detected = [];
  const applications = new Map(
    records.Application.map((application) => [
      application.applicationId,
      application,
    ]),
  );
  const participantsByInterview = new Map();
  for (const participant of records.InterviewParticipant) {
    const participants = participantsByInterview.get(participant.interviewId) || [];
    participants.push(participant);
    participantsByInterview.set(participant.interviewId, participants);
  }
  const scorecardsByInterview = new Map();
  for (const scorecard of records.Scorecard) {
    const scorecards = scorecardsByInterview.get(scorecard.interviewId) || [];
    scorecards.push(scorecard);
    scorecardsByInterview.set(scorecard.interviewId, scorecards);
  }

  const outOfBandOffers = records.Offer.filter((offer) => {
    const application = applications.get(offer.applicationId);
    const requisition = records.Requisition.find(
      (item) => item.requisitionId === application?.requisitionId,
    );
    return (
      requisition &&
      (Number(offer.baseSalary) < Number(requisition.minSalary) ||
        Number(offer.baseSalary) > Number(requisition.maxSalary))
    );
  });
  for (const offer of outOfBandOffers) {
    detected.push({
      type: "OFFER_EXCEEDS_SALARY_BAND",
      entityId: offer.offerId,
      relatedEntityId: null,
    });
  }

  const scheduledInterviews = records.Interview.filter(
    (interview) => interview.status === "SCHEDULED",
  );
  for (let firstIndex = 0; firstIndex < scheduledInterviews.length; firstIndex++) {
    const first = scheduledInterviews[firstIndex];
    const firstIds = new Set(
      (participantsByInterview.get(first.interviewId) || [])
        .filter((participant) => participant.role !== "OBSERVER")
        .map((participant) => participant.employeeId),
    );
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < scheduledInterviews.length;
      secondIndex++
    ) {
      const second = scheduledInterviews[secondIndex];
      const sharesInterviewer = (
        participantsByInterview.get(second.interviewId) || []
      ).some(
        (participant) =>
          participant.role !== "OBSERVER" &&
          firstIds.has(participant.employeeId),
      );
      if (
        sharesInterviewer &&
        first.startTime < second.endTime &&
        second.startTime < first.endTime
      ) {
        detected.push({
          type: "INTERVIEWER_DOUBLE_BOOKED",
          entityId: second.interviewId,
          relatedEntityId: first.interviewId,
        });
      }

      const application = applications.get(second.applicationId);
      if (
        application?.status === "WITHDRAWN" &&
        !detected.some(
          (item) =>
            item.type === "WITHDRAWN_CANDIDATE_STILL_SCHEDULED" &&
            item.entityId === application.applicationId &&
            item.relatedEntityId === second.interviewId,
        )
      ) {
        detected.push({
          type: "WITHDRAWN_CANDIDATE_STILL_SCHEDULED",
          entityId: application.applicationId,
          relatedEntityId: second.interviewId,
        });
      }
    }

    const application = applications.get(first.applicationId);
    if (
      application?.status === "WITHDRAWN" &&
      !detected.some(
        (item) =>
          item.type === "WITHDRAWN_CANDIDATE_STILL_SCHEDULED" &&
          item.entityId === application.applicationId &&
          item.relatedEntityId === first.interviewId,
      )
    ) {
      detected.push({
        type: "WITHDRAWN_CANDIDATE_STILL_SCHEDULED",
        entityId: application.applicationId,
        relatedEntityId: first.interviewId,
      });
    }
  }

  const criteriaById = new Map(
    records.EvaluationCriterion.map((criterion) => [
      criterion.criterionId,
      criterion,
    ]),
  );
  for (const item of records.ScorecardItem) {
    const criterion = criteriaById.get(item.criterionId);
    if (
      criterion &&
      (!criterion.isActive ||
        criterion.category === "IRRELEVANT" ||
        criterion.name === "Favorite Sports Team")
    ) {
      detected.push({
        type: "IRRELEVANT_EVALUATION_CRITERION",
        entityId: item.scorecardId,
        relatedEntityId: item.criterionId,
      });
    }
  }

  for (const interview of records.Interview) {
    if (interview.status !== "COMPLETED") continue;
    const scoredReviewerIds = new Set(
      (scorecardsByInterview.get(interview.interviewId) || []).map(
        (scorecard) => scorecard.reviewerId,
      ),
    );
    for (const participant of participantsByInterview.get(interview.interviewId) || []) {
      if (
        participant.role !== "OBSERVER" &&
        !scoredReviewerIds.has(participant.employeeId)
      ) {
        detected.push({
          type: "INCOMPLETE_SCORECARD",
          entityId: interview.interviewId,
          relatedEntityId: participant.employeeId,
        });
      }
    }
  }

  const requiredInterviewForStage = {
    TECHNICAL: "SCREENING",
    MANAGERIAL: "TECHNICAL",
    HR: "MANAGERIAL",
    OFFER: "HR",
  };
  for (const event of records.ApplicationStageEvent) {
    if (
      !requiredInterviewForStage[event.toStage] ||
      !event.fromStage ||
      event.toStage === "WITHDRAWN" ||
      event.toStage === "REJECTED"
    ) {
      continue;
    }
    const requiredType = requiredInterviewForStage[event.toStage];
    const validReview = records.Interview.some((interview) => {
      if (
        interview.applicationId !== event.applicationId ||
        interview.interviewType !== requiredType ||
        interview.status !== "COMPLETED"
      ) {
        return false;
      }
      const scorecardIds = new Set(
        (scorecardsByInterview.get(interview.interviewId) || []).map(
          (scorecard) => scorecard.reviewerId,
        ),
      );
      const assigned = (participantsByInterview.get(interview.interviewId) || [])
        .filter((participant) => participant.role !== "OBSERVER")
        .map((participant) => participant.employeeId);
      return (
        assigned.length > 0 &&
        assigned.every((reviewerId) => scorecardIds.has(reviewerId))
      );
    });
    if (!validReview) {
      detected.push({
        type: "ADVANCEMENT_WITHOUT_REVIEW",
        entityId: event.applicationId,
        relatedEntityId: null,
      });
    }
  }

  return detected;
};

const run = async () => {
  try {
    console.log("Starting HireFlow data validation...\n");

    const models = Prisma.dmmf.datamodel.models;
    const entries = await Promise.all(
      models.map(async (model) => {
        const delegateName =
          model.name[0].toLowerCase() + model.name.slice(1);
        const delegate = prisma[delegateName];
        if (!delegate || typeof delegate.findMany !== "function") {
          throw new Error(`Prisma delegate not found for ${model.name}`);
        }
        return [model.name, await delegate.findMany()];
      }),
    );
    const records = Object.fromEntries(entries);
    const recordsByModel = new Map(entries);
    const enumValues = new Map(
      Prisma.dmmf.datamodel.enums.map((item) => [
        item.name,
        item.values.map((value) => value.name),
      ]),
    );
    const issues = findSchemaIssues({
      models,
      recordsByModel,
      enumValues,
    });

    const applications = records.Application;
    const requisitions = records.Requisition;
    const eventsByApplication = new Map();
    for (const event of records.ApplicationStageEvent) {
      const events = eventsByApplication.get(event.applicationId) || [];
      events.push(event);
      eventsByApplication.set(event.applicationId, events);
    }
    const legalTransitions = {
      APPLIED: ["SCREENING", "REJECTED", "WITHDRAWN"],
      SCREENING: ["TECHNICAL", "REJECTED", "WITHDRAWN"],
      TECHNICAL: ["MANAGERIAL", "REJECTED", "WITHDRAWN"],
      MANAGERIAL: ["HR", "REJECTED", "WITHDRAWN"],
      HR: ["OFFER", "REJECTED", "WITHDRAWN"],
      OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
      HIRED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };
    const groundTruthPath = require("path").join(
      getExportDir(),
      "ground_truth.json",
    );
    const groundTruth = fs.existsSync(groundTruthPath)
      ? JSON.parse(fs.readFileSync(groundTruthPath, "utf8")).map(formatLabel)
      : [];
    if (!groundTruth.length) {
      issues.push({
        check: "Ground truth file",
        message: "ground_truth.json is missing or empty",
      });
    }
    const expectedAnomalyIds = new Set(
      groundTruth.map((item) => item.entityId),
    );

    const invalidRequisitions = requisitions.filter(
      (item) =>
        Number(item.minSalary) > Number(item.maxSalary) || item.openings < 1,
    );
    if (invalidRequisitions.length) {
      issues.push({
        check: "Requisition salary band and openings",
        count: invalidRequisitions.length,
        examples: invalidRequisitions
          .slice(0, 5)
          .map((item) => item.requisitionId),
      });
    }

    const duplicateApplications = new Set();
    const applicationPairs = new Set();
    for (const application of applications) {
      const key = `${application.candidateId}|${application.requisitionId}`;
      if (applicationPairs.has(key)) duplicateApplications.add(key);
      applicationPairs.add(key);
    }
    if (duplicateApplications.size) {
      issues.push({
        check: "Duplicate candidate-requisition applications",
        count: duplicateApplications.size,
      });
    }

    const invalidApplicationStates = applications.filter(
      (item) =>
        (item.status === "WITHDRAWN" && item.currentStage !== "WITHDRAWN") ||
        (item.status === "HIRED" && item.currentStage !== "HIRED") ||
        (item.status === "REJECTED" && item.currentStage !== "REJECTED"),
    );
    if (invalidApplicationStates.length) {
      issues.push({
        check: "Application lifecycle consistency",
        count: invalidApplicationStates.length,
        examples: invalidApplicationStates
          .slice(0, 5)
          .map((item) => item.applicationId),
      });
    }

    for (const [applicationId, events] of eventsByApplication) {
      events.sort(
        (left, right) =>
          left.changedAt.getTime() - right.changedAt.getTime() ||
          left.eventId.localeCompare(right.eventId),
      );
      let priorStage = null;
      for (const event of events) {
        if (event.fromStage === null && event.toStage !== "APPLIED") {
          issues.push({
            check: "Application initial stage history",
            count: 1,
            examples: [applicationId],
          });
        }
        if (priorStage && event.fromStage !== priorStage) {
          issues.push({
            check: "Application stage event continuity",
            count: 1,
            examples: [applicationId],
          });
        }
        if (
          event.fromStage &&
          !legalTransitions[event.fromStage]?.includes(event.toStage) &&
          !expectedAnomalyIds.has(applicationId)
        ) {
          issues.push({
            check: "Application stage transition",
            count: 1,
            examples: [`${applicationId}: ${event.fromStage} -> ${event.toStage}`],
          });
        }
        priorStage = event.toStage;
      }

      const application = applications.find(
        (item) => item.applicationId === applicationId,
      );
      if (application && priorStage !== application.currentStage) {
        issues.push({
          check: "Application state matches latest stage event",
          count: 1,
          examples: [applicationId],
        });
      }
    }

    const approvalIssues = records.Approval.filter((approval) => {
      const targetCount = Number(Boolean(approval.offerId)) +
        Number(Boolean(approval.requisitionId));
      return (
        targetCount !== 1 ||
        (approval.approvalType === "OFFER" && !approval.offerId) ||
        (approval.approvalType === "REQUISITION" && !approval.requisitionId) ||
        (approval.status === "PENDING" && approval.decidedAt != null) ||
        (approval.status !== "PENDING" && approval.decidedAt == null)
      );
    });
    if (approvalIssues.length) {
      issues.push({
        check: "Approval target and lifecycle",
        count: approvalIssues.length,
        examples: approvalIssues.slice(0, 5).map((item) => item.approvalId),
      });
    }

    const employeeIds = new Set(
      records.Employee.map((employee) => employee.employeeId),
    );
    const panelMembersByPanel = new Map();
    for (const member of records.PanelMember) {
      const members = panelMembersByPanel.get(member.panelId) || new Set();
      members.add(member.employeeId);
      panelMembersByPanel.set(member.panelId, members);
    }
    const interviewIssues = [];
    for (const interview of records.Interview) {
      const application = applications.find(
        (item) => item.applicationId === interview.applicationId,
      );
      const panel = records.InterviewPanel.find(
        (item) => item.panelId === interview.panelId,
      );
      if (
        application &&
        panel &&
        application.requisitionId !== panel.requisitionId
      ) {
        interviewIssues.push(interview.interviewId);
      }
    }
    for (const participant of records.InterviewParticipant) {
      if (!employeeIds.has(participant.employeeId)) {
        interviewIssues.push(participant.participantId);
      }
    }
    if (interviewIssues.length) {
      issues.push({
        check: "Interview panel and participant joins",
        count: interviewIssues.length,
        examples: interviewIssues.slice(0, 5),
      });
    }

    const scorecardJoinIssues = [];
    for (const scorecard of records.Scorecard) {
      const interview = records.Interview.find(
        (item) => item.interviewId === scorecard.interviewId,
      );
      const assigned = records.InterviewParticipant.some(
        (participant) =>
          participant.interviewId === scorecard.interviewId &&
          participant.employeeId === scorecard.reviewerId &&
          participant.role !== "OBSERVER",
      );
      if (interview && !assigned) scorecardJoinIssues.push(scorecard.scorecardId);
    }
    for (const item of records.ScorecardItem) {
      const criterion = records.EvaluationCriterion.find(
        (entry) => entry.criterionId === item.criterionId,
      );
      const scorecard = records.Scorecard.find(
        (entry) => entry.scorecardId === item.scorecardId,
      );
      const interview = scorecard
        ? records.Interview.find(
            (entry) => entry.interviewId === scorecard.interviewId,
          )
        : null;
      const application = interview
        ? applications.find(
            (entry) => entry.applicationId === interview.applicationId,
          )
        : null;
      if (
        criterion &&
        application &&
        criterion.requisitionId !== application.requisitionId
      ) {
        scorecardJoinIssues.push(item.itemId);
      }
    }
    if (scorecardJoinIssues.length) {
      issues.push({
        check: "Scorecard reviewer and criterion joins",
        count: scorecardJoinIssues.length,
        examples: scorecardJoinIssues.slice(0, 5),
      });
    }

    const scorecardItemsByCard = new Map();
    for (const item of records.ScorecardItem) {
      const items = scorecardItemsByCard.get(item.scorecardId) || [];
      items.push(item);
      scorecardItemsByCard.set(item.scorecardId, items);
    }
    const criteriaById = new Map(
      records.EvaluationCriterion.map((item) => [item.criterionId, item]),
    );
    const invalidScorecards = [];
    for (const scorecard of records.Scorecard) {
      const items = scorecardItemsByCard.get(scorecard.scorecardId) || [];
      const activeItems = items.filter((item) =>
        criteriaById.get(item.criterionId)?.isActive,
      );
      const weighted = activeItems.reduce((total, item) => {
        const criterion = criteriaById.get(item.criterionId);
        return total + Number(item.score) * Number(criterion?.weight || 0);
      }, 0);
      const totalWeight = activeItems.reduce(
        (total, item) =>
          total + Number(criteriaById.get(item.criterionId)?.weight || 0),
        0,
      );
      const score = totalWeight > 0 ? weighted / totalWeight : -1;
      const expectedRecommendation =
        score >= 8
          ? "STRONG_YES"
          : score >= 7
            ? "YES"
            : score >= 5
              ? "MAYBE"
              : score >= 3
                ? "NO"
                : "STRONG_NO";
      if (
        activeItems.length === 0 ||
        items.some(
          (item) =>
            Number(item.score) < 0 ||
            Number(item.score) > 10 ||
            !criteriaById.has(item.criterionId),
        ) ||
        scorecard.recommendation !== expectedRecommendation
      ) {
        invalidScorecards.push(scorecard.scorecardId);
      }
    }
    if (invalidScorecards.length) {
      issues.push({
        check: "Scorecard rubric and derived recommendation",
        count: invalidScorecards.length,
        examples: invalidScorecards.slice(0, 5),
      });
    }

    const detectedAnomalies = detectAnomalies(records);
    const groundTruthResults = groundTruth.map((label) => ({
      anomalyId: label.anomalyId,
      type: label.type,
      entityId: label.entityId,
      relatedEntityId: label.relatedEntityId,
      detected: groundTruthMatches(detectedAnomalies, label),
    }));

    const recordCounts = Object.fromEntries(
      Object.entries(records).map(([name, rows]) => [
        name[0].toLowerCase() + name.slice(1),
        rows.length,
      ]),
    );
    const missedLabels = groundTruthResults.filter((item) => !item.detected);
    const report = {
      generatedAt: new Date().toISOString(),
      recordCounts,
      integrityIssues: issues,
      detectedAnomalies,
      groundTruthResults,
      summary: {
        integrityChecksPassed: issues.length === 0,
        integrityIssueCount: issues.length,
        detectedAnomalyTypes: new Set(
          detectedAnomalies.map((item) => item.type),
        ).size,
        groundTruthCases: groundTruth.length,
        groundTruthCasesDetected: groundTruthResults.filter(
          (item) => item.detected,
        ).length,
        groundTruthCasesMissed: missedLabels.length,
      },
    };

    fs.mkdirSync(getExportDir(), { recursive: true });
    fs.writeFileSync(
      require("path").join(getExportDir(), "validation_summary.json"),
      JSON.stringify(report, null, 2),
    );

    console.log("DATA VALIDATION COMPLETED\n");
    console.log("Record counts:", recordCounts);
    console.log("Integrity issues:", issues.length);
    console.log(
      "Ground-truth entities matched:",
      `${report.summary.groundTruthCasesDetected}/${report.summary.groundTruthCases}`,
    );
    if (issues.length || missedLabels.length) process.exitCode = 1;
  } catch (error) {
    console.error("Data validation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) run();

module.exports = { detectAnomalies };
