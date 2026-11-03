const prisma = require("../../src/config/database");
const config = require("./config");
const { createRandom } = require("./random");
const {
  createInterview,
  completeInterview,
  rescheduleInterview,
} = require("../../src/services/interviewService");
const { updateApplicationStage } = require("../../src/services/applicationStageService");
const { submitInterviewScorecards } = require("./scorecardGenerator");

const random = createRandom(config.seed + 1);
const transitions = [
  { fromStage: "SCREENING", toStage: "TECHNICAL", interviewType: "TECHNICAL" },
  { fromStage: "TECHNICAL", toStage: "MANAGERIAL", interviewType: "MANAGERIAL" },
  { fromStage: "MANAGERIAL", toStage: "HR", interviewType: "HR" },
];
const workingHours = [9, 10, 11, 13, 14, 15];

const makeTimeSlots = () => {
  const slots = [];
  let date = new Date(`${config.calendarStart}T00:00:00.000Z`);
  let workingDays = 0;

  while (workingDays < 40) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
      const dateKey = date.toISOString().slice(0, 10);
      for (const hour of workingHours) {
        const startTime = new Date(
          `${dateKey}T${String(hour).padStart(2, "0")}:00:00.000Z`,
        );
        slots.push({
          startTime,
          endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
        });
      }
      workingDays++;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return slots;
};

const schedule = async (application, panel, interviewType, slots) => {
  const members = panel.members
    .filter((member) => member.employee.isActive)
    .map((member) => member.employeeId);
  if (members.length < 2) {
    throw new Error(`Panel ${panel.panelId} needs two active members.`);
  }

  const pairs = [];
  for (let first = 0; first < members.length; first++) {
    for (let second = first + 1; second < members.length; second++) {
      pairs.push([
        { employeeId: members[first], role: "LEAD" },
        { employeeId: members[second], role: "PANELIST" },
      ]);
    }
  }

  let lastConflict;
  for (const slot of random.shuffle(slots)) {
    for (const participants of random.shuffle(pairs)) {
      try {
        return await createInterview({
          applicationId: application.applicationId,
          panelId: panel.panelId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          interviewType,
          participants,
        });
      } catch (error) {
        if (error.statusCode !== 409 && error.code !== "P2034") throw error;
        lastConflict = error;
      }
    }
  }

  throw new Error(
    `No non-conflicting slot for ${application.applicationId} (${interviewType}): ${lastConflict?.message || "calendar full"}`,
  );
};

const run = async () => {
  const hr = await prisma.employee.findFirst({
    where: {
      role: "HR",
      isActive: true,
      employeeId: { startsWith: "SYN-EMP-" },
    },
    orderBy: { employeeId: "asc" },
  });
  if (!hr) throw new Error("No synthetic HR employee found.");

  const screeningInterviews = await prisma.interview.findMany({
    where: {
      interviewType: "SCREENING",
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
      application: true,
      participants: true,
      scorecards: { select: { reviewerId: true } },
    },
    orderBy: { applicationId: "asc" },
  });
  const applications = [];
  const seen = new Set();
  for (const interview of screeningInterviews) {
    const required = interview.participants
      .filter((participant) => participant.role !== "OBSERVER")
      .map((participant) => participant.employeeId);
    const submitted = new Set(
      interview.scorecards.map((scorecard) => scorecard.reviewerId),
    );
    if (
      required.every((reviewerId) => submitted.has(reviewerId)) &&
      !seen.has(interview.applicationId)
    ) {
      applications.push(interview.application);
      seen.add(interview.applicationId);
    }
    if (applications.length >= config.followupApplications) break;
  }
  if (applications.length < config.followupApplications) {
    throw new Error(
      `Need ${config.followupApplications} fully reviewed screening applications; found ${applications.length}.`,
    );
  }

  const panels = await prisma.interviewPanel.findMany({
    where: {
      requisitionId: {
        in: applications.map((application) => application.requisitionId),
      },
      isActive: true,
    },
    include: {
      members: {
        select: { employeeId: true, employee: { select: { isActive: true } } },
      },
    },
  });
  const panelByRequisition = new Map(
    panels.map((panel) => [panel.requisitionId, panel]),
  );
  const criteria = await prisma.evaluationCriterion.findMany({
    where: {
      requisitionId: {
        in: applications.map((application) => application.requisitionId),
      },
      isActive: true,
    },
    orderBy: { criterionId: "asc" },
  });
  const criteriaByRequisition = new Map();
  for (const criterion of criteria) {
    const list = criteriaByRequisition.get(criterion.requisitionId) || [];
    list.push(criterion);
    criteriaByRequisition.set(criterion.requisitionId, list);
  }

  const slots = makeTimeSlots();
  let generated = 0;
  let rescheduled = false;
  for (const application of applications) {
    const panel = panelByRequisition.get(application.requisitionId);
    if (!panel) throw new Error(`No active panel for ${application.requisitionId}`);

    for (const transition of transitions) {
      await updateApplicationStage(application.applicationId, {
        toStage: transition.toStage,
        changedById: hr.employeeId,
        reason: `Synthetic application passed reviewed ${transition.fromStage.toLowerCase()} stage`,
      });

      const interview = await schedule(
        application,
        panel,
        transition.interviewType,
        slots,
      );
      generated++;

      let scheduledInterview = interview;
      if (!rescheduled) {
        const rescheduler = interview.participants.find(
          (participant) => participant.role !== "OBSERVER",
        );
        if (!rescheduler) {
          throw new Error(`No interviewer assigned to ${interview.interviewId}`);
        }

        for (const alternateSlot of random.shuffle(slots)) {
          if (alternateSlot.startTime.getTime() === interview.startTime.getTime()) {
            continue;
          }
          try {
            scheduledInterview = await rescheduleInterview(interview.interviewId, {
              rescheduledById: rescheduler.employeeId,
              startTime: alternateSlot.startTime,
              endTime: alternateSlot.endTime,
              reason: "Synthetic calendar adjustment",
            });
            rescheduled = true;
            break;
          } catch (error) {
            if (error.statusCode !== 409 && error.code !== "P2034") throw error;
          }
        }
      }

      const lead = scheduledInterview.participants.find(
        (participant) => participant.role === "LEAD",
      );
      await completeInterview(interview.interviewId, {
        completedById: lead.employeeId,
      });
      await submitInterviewScorecards(
        {
          ...scheduledInterview,
          scorecards: [],
        },
        criteriaByRequisition.get(application.requisitionId) || [],
        random,
      );
    }

    await updateApplicationStage(application.applicationId, {
      toStage: "OFFER",
      changedById: hr.employeeId,
      reason: "Synthetic application passed reviewed HR stage",
    });
  }

  if (!rescheduled) {
    throw new Error("Could not produce the required rescheduled interview.");
  }
  console.log(`Later-stage interviews generated: ${generated}`);
  console.log(`Applications advanced to OFFER: ${applications.length}`);
  console.log("Rescheduled interview events generated: 1");
};

run()
  .catch((error) => {
    console.error("Later-stage generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
