const fs = require("fs");
const path = require("path");
const prisma = require("../../src/config/database");

const run = async () => {
  try {
    const exportDir = path.join(__dirname, "../../exports");
    const groundTruthPath = path.join(exportDir, "ground_truth.json");

    // Prevent accidental duplicate anomaly injection.
    if (fs.existsSync(groundTruthPath)) {
      throw new Error(
        "Ground truth already exists. Anomalies may already have been injected.",
      );
    }

    const hr = await prisma.employee.findFirst({
      where: { role: "HR", isActive: true },
    });

    if (!hr) throw new Error("No active HR employee found");

    const truth = [];

    // Get completed synthetic screening interviews.
    const interviews = await prisma.interview.findMany({
      where: {
        status: "COMPLETED",
        application: {
          is: {
            currentStage: "SCREENING",
            status: "ACTIVE",
            candidateId: { startsWith: "CAND-" },
            requisitionId: { startsWith: "REQ-2026-" },
          },
        },
      },
      include: {
        participants: true,
        application: true,
      },
      orderBy: { startTime: "asc" },
    });

    if (interviews.length < 3) {
      throw new Error("Not enough completed interviews to inject anomalies");
    }

    // ANOMALY 1: Candidate advances without required review.
    const bypassApp = await prisma.application.findFirst({
      where: {
        status: "ACTIVE",
        currentStage: "APPLIED",
        candidateId: { startsWith: "CAND-" },
        requisitionId: { startsWith: "REQ-2026-" },
        interviews: { none: {} },
      },
    });

    if (!bypassApp) {
      throw new Error("No suitable application found for anomaly 1");
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { applicationId: bypassApp.applicationId },
        data: { currentStage: "TECHNICAL" },
      });

      await tx.applicationStageEvent.create({
        data: {
          applicationId: bypassApp.applicationId,
          fromStage: "APPLIED",
          toStage: "TECHNICAL",
          changedById: hr.employeeId,
          reason: "ANOMALY-001: Screening review deliberately bypassed",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: hr.employeeId,
          action: "ANOMALY_INJECTED",
          entityType: "Application",
          entityId: bypassApp.applicationId,
          details: { anomalyId: "ANOMALY-001" },
        },
      });
    });

    truth.push({
      anomalyId: "ANOMALY-001",
      type: "ADVANCEMENT_WITHOUT_REVIEW",
      entityId: bypassApp.applicationId,
      description:
        "Application advanced from APPLIED to TECHNICAL without screening review.",
      expectedDetection:
        "Stage progression lacks the required completed review.",
    });

    // ANOMALY 2: Two interviews overlap for the same interviewer.
    let conflict = null;

    for (let i = 0; i < interviews.length && !conflict; i++) {
      for (let j = i + 1; j < interviews.length; j++) {
        const first = interviews[i];
        const second = interviews[j];

        const firstInterviewers = first.participants
          .filter((p) => p.role !== "OBSERVER")
          .map((p) => p.employeeId);

        const shared = second.participants.find(
          (p) =>
            p.role !== "OBSERVER" && firstInterviewers.includes(p.employeeId),
        );

        if (shared) {
          conflict = { first, second, shared };
          break;
        }
      }
    }

    if (!conflict) {
      throw new Error("No shared interviewer found for anomaly 2");
    }

    const { first, second, shared } = conflict;

    await prisma.$transaction(async (tx) => {
      await tx.interview.update({
        where: { interviewId: first.interviewId },
        data: { status: "SCHEDULED" },
      });

      await tx.interview.update({
        where: { interviewId: second.interviewId },
        data: {
          status: "SCHEDULED",
          startTime: first.startTime,
          endTime: first.endTime,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: hr.employeeId,
          action: "ANOMALY_INJECTED",
          entityType: "Interview",
          entityId: second.interviewId,
          details: {
            anomalyId: "ANOMALY-002",
            conflictingInterviewId: first.interviewId,
            sharedInterviewerId: shared.employeeId,
          },
        },
      });
    });

    truth.push({
      anomalyId: "ANOMALY-002",
      type: "INTERVIEWER_DOUBLE_BOOKED",
      entityId: second.interviewId,
      relatedEntityId: first.interviewId,
      description: "Two scheduled interviews overlap for the same interviewer.",
      expectedDetection:
        "An interviewer has conflicting scheduled interview times.",
    });

    // ANOMALY 3: Offer exceeds the requisition salary band.
    const existingOffer = await prisma.offer.findFirst({
      where: { status: "APPROVED" },
      include: {
        application: {
          include: { requisition: true },
        },
      },
    });

    if (!existingOffer) {
      throw new Error("No approved offer found for anomaly 3");
    }

    const salaryLimit = Number(existingOffer.application.requisition.maxSalary);

    const excessiveSalary = salaryLimit + 100000;

    const excessiveOffer = await prisma.offer.create({
      data: {
        applicationId: existingOffer.applicationId,
        version: existingOffer.version + 1,
        baseSalary: excessiveSalary,
        bonus: 0,
        currency: "INR",
        status: "PENDING_APPROVAL",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: hr.employeeId,
        action: "ANOMALY_INJECTED",
        entityType: "Offer",
        entityId: excessiveOffer.offerId,
        details: { anomalyId: "ANOMALY-003" },
      },
    });

    truth.push({
      anomalyId: "ANOMALY-003",
      type: "OFFER_EXCEEDS_SALARY_BAND",
      entityId: excessiveOffer.offerId,
      description: `Offer salary ${excessiveSalary} exceeds approved maximum ${salaryLimit}.`,
      expectedDetection:
        "Offer base salary exceeds the requisition compensation limit.",
    });

    // ANOMALY 4: Withdrawn candidate still has a scheduled interview.
    const withdrawnInterview = interviews.find(
      (item) =>
        item.interviewId !== first.interviewId &&
        item.interviewId !== second.interviewId,
    );

    if (!withdrawnInterview) {
      throw new Error("No suitable interview found for anomaly 4");
    }

    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: {
          applicationId: withdrawnInterview.applicationId,
        },
        data: {
          status: "WITHDRAWN",
          currentStage: "WITHDRAWN",
        },
      });

      await tx.applicationStageEvent.create({
        data: {
          applicationId: withdrawnInterview.applicationId,
          fromStage: "SCREENING",
          toStage: "WITHDRAWN",
          changedById: hr.employeeId,
          reason:
            "ANOMALY-004: Candidate withdrawn while interview remains scheduled",
        },
      });

      await tx.interview.update({
        where: {
          interviewId: withdrawnInterview.interviewId,
        },
        data: { status: "SCHEDULED" },
      });

      await tx.auditLog.create({
        data: {
          actorId: hr.employeeId,
          action: "ANOMALY_INJECTED",
          entityType: "Application",
          entityId: withdrawnInterview.applicationId,
          details: {
            anomalyId: "ANOMALY-004",
            interviewId: withdrawnInterview.interviewId,
          },
        },
      });
    });

    truth.push({
      anomalyId: "ANOMALY-004",
      type: "WITHDRAWN_CANDIDATE_STILL_SCHEDULED",
      entityId: withdrawnInterview.applicationId,
      relatedEntityId: withdrawnInterview.interviewId,
      description:
        "Candidate is withdrawn but still has a scheduled interview.",
      expectedDetection:
        "Scheduled interview belongs to a withdrawn application.",
    });

    // ANOMALY 5: Irrelevant criterion added to a scorecard.
    const scorecard = await prisma.scorecard.findFirst({
      include: {
        interview: {
          include: { application: true },
        },
      },
    });

    if (!scorecard) {
      throw new Error("No scorecard found for anomaly 5");
    }

    const irrelevantCriterion = await prisma.evaluationCriterion.create({
      data: {
        requisitionId: scorecard.interview.application.requisitionId,
        name: "Favorite Sports Team",
        description: "Personal preference unrelated to job performance.",
        category: "IRRELEVANT",
        weight: 1,
        isRequired: false,
        isActive: false,
      },
    });

    await prisma.scorecardItem.create({
      data: {
        scorecardId: scorecard.scorecardId,
        criterionId: irrelevantCriterion.criterionId,
        score: 9,
        comments: "ANOMALY-005: Irrelevant evaluation criterion",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: hr.employeeId,
        action: "ANOMALY_INJECTED",
        entityType: "Scorecard",
        entityId: scorecard.scorecardId,
        details: {
          anomalyId: "ANOMALY-005",
          criterionId: irrelevantCriterion.criterionId,
        },
      },
    });

    truth.push({
      anomalyId: "ANOMALY-005",
      type: "IRRELEVANT_EVALUATION_CRITERION",
      entityId: scorecard.scorecardId,
      relatedEntityId: irrelevantCriterion.criterionId,
      description:
        "Scorecard includes a criterion unrelated to job performance.",
      expectedDetection: "Evaluation contains an irrelevant criterion.",
    });

    // Export ground truth separately from operational records.
    fs.mkdirSync(exportDir, { recursive: true });

    fs.writeFileSync(groundTruthPath, JSON.stringify(truth, null, 2));

    const headers = [
      "anomalyId",
      "type",
      "entityId",
      "relatedEntityId",
      "description",
      "expectedDetection",
    ];

    const csv = [
      headers.join(","),
      ...truth.map((item) =>
        headers.map((header) => JSON.stringify(item[header] ?? "")).join(","),
      ),
    ].join("\n");

    fs.writeFileSync(path.join(exportDir, "ground_truth.csv"), csv);

    console.log("\nAnomaly injection completed:");

    truth.forEach((item) => {
      console.log(`${item.anomalyId}: ${item.type}`);
    });

    console.log("\nGround truth files created in backend/exports/");
  } catch (error) {
    console.error("Anomaly injection failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
