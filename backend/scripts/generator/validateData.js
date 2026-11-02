const fs = require("fs");
const path = require("path");
const prisma = require("../../src/config/database");

const run = async () => {
  try {
    console.log("Starting HireFlow data validation...\n");

    const [
      employees,
      requisitions,
      candidates,
      applications,
      panels,
      interviews,
      participants,
      scorecards,
      scorecardItems,
      criteria,
      offers,
      approvals,
      stageEvents,
    ] = await Promise.all([
      prisma.employee.findMany(),
      prisma.requisition.findMany(),
      prisma.candidate.findMany(),
      prisma.application.findMany(),
      prisma.interviewPanel.findMany(),
      prisma.interview.findMany(),
      prisma.interviewParticipant.findMany(),
      prisma.scorecard.findMany(),
      prisma.scorecardItem.findMany(),
      prisma.evaluationCriterion.findMany(),
      prisma.offer.findMany({
        include: { application: { include: { requisition: true } } },
      }),
      prisma.approval.findMany(),
      prisma.applicationStageEvent.findMany(),
    ]);

    const issues = [];
    const expectedAnomalies = [];

    const checkUnique = (records, key, label) => {
      const values = records.map((record) => record[key]);
      const duplicates = values.filter(
        (value, index) => values.indexOf(value) !== index,
      );

      if (duplicates.length > 0) {
        issues.push({
          check: `${label} primary-key uniqueness`,
          count: duplicates.length,
          examples: [...new Set(duplicates)].slice(0, 5),
        });
      }
    };

    const checkForeignKey = (records, field, validIds, label) => {
      const invalid = records.filter(
        (record) => record[field] != null && !validIds.has(record[field]),
      );

      if (invalid.length > 0) {
        issues.push({
          check: `${label} foreign-key integrity`,
          count: invalid.length,
          examples: invalid.slice(0, 5).map((item) => item[field]),
        });
      }
    };

    const ids = (records, field) =>
      new Set(records.map((record) => record[field]));

    // 1. Primary-key uniqueness.
    checkUnique(employees, "employeeId", "Employee");
    checkUnique(requisitions, "requisitionId", "Requisition");
    checkUnique(candidates, "candidateId", "Candidate");
    checkUnique(applications, "applicationId", "Application");
    checkUnique(panels, "panelId", "InterviewPanel");
    checkUnique(interviews, "interviewId", "Interview");
    checkUnique(participants, "participantId", "InterviewParticipant");
    checkUnique(scorecards, "scorecardId", "Scorecard");
    checkUnique(scorecardItems, "itemId", "ScorecardItem");
    checkUnique(criteria, "criterionId", "EvaluationCriterion");
    checkUnique(offers, "offerId", "Offer");
    checkUnique(approvals, "approvalId", "Approval");
    checkUnique(stageEvents, "eventId", "ApplicationStageEvent");

    // 2. Foreign-key integrity.
    checkForeignKey(
      applications,
      "candidateId",
      ids(candidates, "candidateId"),
      "Application candidate",
    );

    checkForeignKey(
      applications,
      "requisitionId",
      ids(requisitions, "requisitionId"),
      "Application requisition",
    );

    checkForeignKey(
      interviews,
      "applicationId",
      ids(applications, "applicationId"),
      "Interview application",
    );

    checkForeignKey(
      interviews,
      "panelId",
      ids(panels, "panelId"),
      "Interview panel",
    );

    checkForeignKey(
      participants,
      "interviewId",
      ids(interviews, "interviewId"),
      "Participant interview",
    );

    checkForeignKey(
      participants,
      "employeeId",
      ids(employees, "employeeId"),
      "Participant employee",
    );

    checkForeignKey(
      scorecards,
      "interviewId",
      ids(interviews, "interviewId"),
      "Scorecard interview",
    );

    checkForeignKey(
      scorecards,
      "reviewerId",
      ids(employees, "employeeId"),
      "Scorecard reviewer",
    );

    checkForeignKey(
      scorecardItems,
      "scorecardId",
      ids(scorecards, "scorecardId"),
      "Scorecard item",
    );

    checkForeignKey(
      scorecardItems,
      "criterionId",
      ids(criteria, "criterionId"),
      "Scorecard criterion",
    );

    checkForeignKey(
      offers,
      "applicationId",
      ids(applications, "applicationId"),
      "Offer application",
    );

    checkForeignKey(
      approvals,
      "approverId",
      ids(employees, "employeeId"),
      "Approval employee",
    );

    checkForeignKey(
      stageEvents,
      "applicationId",
      ids(applications, "applicationId"),
      "Stage event application",
    );

    // 3. Duplicate candidate-requisition applications.
    const applicationPairs = applications.map(
      (item) => `${item.candidateId}|${item.requisitionId}`,
    );

    const duplicatePairs = applicationPairs.filter(
      (pair, index) => applicationPairs.indexOf(pair) !== index,
    );

    if (duplicatePairs.length > 0) {
      issues.push({
        check: "Duplicate candidate-requisition applications",
        count: duplicatePairs.length,
      });
    }

    // 4. Detect salary-band anomalies.
    for (const offer of offers) {
      const requisition = offer.application.requisition;
      const salary = Number(offer.baseSalary);

      if (
        salary < Number(requisition.minSalary) ||
        salary > Number(requisition.maxSalary)
      ) {
        expectedAnomalies.push({
          type: "OFFER_EXCEEDS_SALARY_BAND",
          entityId: offer.offerId,
        });
      }
    }

    // 5. Detect interviewer scheduling conflicts.
    const scheduledInterviews = interviews.filter(
      (item) => item.status === "SCHEDULED",
    );

    const scheduledIds = new Set(
      scheduledInterviews.map((item) => item.interviewId),
    );

    const activeParticipants = participants.filter(
      (item) => item.role !== "OBSERVER" && scheduledIds.has(item.interviewId),
    );

    const interviewMap = new Map(
      scheduledInterviews.map((item) => [item.interviewId, item]),
    );

    const conflicts = new Set();

    for (let i = 0; i < activeParticipants.length; i++) {
      for (let j = i + 1; j < activeParticipants.length; j++) {
        const a = activeParticipants[i];
        const b = activeParticipants[j];

        if (a.employeeId !== b.employeeId || a.interviewId === b.interviewId) {
          continue;
        }

        const first = interviewMap.get(a.interviewId);
        const second = interviewMap.get(b.interviewId);

        const overlaps =
          first.startTime < second.endTime && second.startTime < first.endTime;

        if (overlaps) {
          conflicts.add(
            [first.interviewId, second.interviewId].sort().join("|"),
          );
        }
      }
    }

    if (conflicts.size > 0) {
      expectedAnomalies.push({
        type: "INTERVIEWER_DOUBLE_BOOKED",
        count: conflicts.size,
        examples: [...conflicts].slice(0, 5),
      });
    }

    // 6. Detect withdrawn applications with scheduled interviews.
    const applicationMap = new Map(
      applications.map((item) => [item.applicationId, item]),
    );

    const withdrawnScheduled = scheduledInterviews.filter((interview) => {
      const application = applicationMap.get(interview.applicationId);
      return application?.status === "WITHDRAWN";
    });

    for (const interview of withdrawnScheduled) {
      expectedAnomalies.push({
        type: "WITHDRAWN_CANDIDATE_STILL_SCHEDULED",
        entityId: interview.applicationId,
        relatedEntityId: interview.interviewId,
      });
    }

    // 7. Detect irrelevant evaluation criteria.
    const criterionMap = new Map(
      criteria.map((item) => [item.criterionId, item]),
    );

    for (const item of scorecardItems) {
      const criterion = criterionMap.get(item.criterionId);

      if (
        criterion &&
        (criterion.category === "IRRELEVANT" ||
          criterion.name === "Favorite Sports Team")
      ) {
        expectedAnomalies.push({
          type: "IRRELEVANT_EVALUATION_CRITERION",
          entityId: item.scorecardId,
          relatedEntityId: item.criterionId,
        });
      }
    }

    // 8. Detect advancement without a completed review.
    const interviewApplicationIds = new Set(
      interviews
        .filter((item) => item.status === "COMPLETED")
        .map((item) => item.applicationId),
    );

    for (const event of stageEvents) {
      if (
        event.fromStage === "APPLIED" &&
        event.toStage === "TECHNICAL" &&
        !interviewApplicationIds.has(event.applicationId)
      ) {
        expectedAnomalies.push({
          type: "ADVANCEMENT_WITHOUT_REVIEW",
          entityId: event.applicationId,
        });
      }
    }

    // 9. Basic field and arithmetic validation.
    const invalidSalaryBands = requisitions.filter(
      (item) => Number(item.minSalary) > Number(item.maxSalary),
    );

    if (invalidSalaryBands.length > 0) {
      issues.push({
        check: "Requisition salary band",
        count: invalidSalaryBands.length,
      });
    }

    const invalidInterviewDates = interviews.filter(
      (item) => item.startTime >= item.endTime,
    );

    if (invalidInterviewDates.length > 0) {
      issues.push({
        check: "Interview date and time",
        count: invalidInterviewDates.length,
      });
    }

    const invalidApplicationStates = applications.filter(
      (item) =>
        (item.status === "WITHDRAWN" && item.currentStage !== "WITHDRAWN") ||
        (item.status === "HIRED" && item.currentStage !== "HIRED") ||
        (item.status === "REJECTED" && item.currentStage !== "REJECTED"),
    );

    if (invalidApplicationStates.length > 0) {
      issues.push({
        check: "Application lifecycle consistency",
        count: invalidApplicationStates.length,
      });
    }

    // 10. Compare detected anomalies with ground truth.
    const truthPath = path.join(__dirname, "../../exports/ground_truth.json");

    let groundTruth = [];

    if (fs.existsSync(truthPath)) {
      groundTruth = JSON.parse(fs.readFileSync(truthPath, "utf8"));
    } else {
      issues.push({
        check: "Ground truth file",
        message: "ground_truth.json not found",
      });
    }

    const detectedTypes = new Set(expectedAnomalies.map((item) => item.type));

    const groundTruthResults = groundTruth.map((item) => ({
      anomalyId: item.anomalyId,
      type: item.type,
      detected: detectedTypes.has(item.type),
    }));

    const report = {
      generatedAt: new Date().toISOString(),
      recordCounts: {
        employees: employees.length,
        requisitions: requisitions.length,
        candidates: candidates.length,
        applications: applications.length,
        interviewPanels: panels.length,
        interviews: interviews.length,
        participants: participants.length,
        scorecards: scorecards.length,
        scorecardItems: scorecardItems.length,
        evaluationCriteria: criteria.length,
        offers: offers.length,
        approvals: approvals.length,
        stageEvents: stageEvents.length,
      },
      integrityIssues: issues,
      detectedAnomalies: expectedAnomalies,
      groundTruthResults,
      summary: {
        integrityChecksPassed: issues.length === 0,
        integrityIssueCount: issues.length,
        detectedAnomalyTypes: detectedTypes.size,
        groundTruthCases: groundTruth.length,
        groundTruthCasesDetected: groundTruthResults.filter(
          (item) => item.detected,
        ).length,
      },
    };

    const exportDir = path.join(__dirname, "../../exports");
    fs.mkdirSync(exportDir, { recursive: true });

    fs.writeFileSync(
      path.join(exportDir, "validation_summary.json"),
      JSON.stringify(report, null, 2),
    );

    console.log("DATA VALIDATION COMPLETED\n");
    console.log("Record counts:", report.recordCounts);
    console.log("\nIntegrity issues:", issues.length);
    console.log("Detected anomaly types:", detectedTypes.size);
    console.log(
      "Ground-truth cases detected:",
      `${report.summary.groundTruthCasesDetected}/${report.summary.groundTruthCases}`,
    );

    if (issues.length > 0) {
      console.log("\nIntegrity issue details:");
      console.log(JSON.stringify(issues, null, 2));
    }

    console.log("\nValidation report: exports/validation_summary.json");
  } catch (error) {
    console.error("Validation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
