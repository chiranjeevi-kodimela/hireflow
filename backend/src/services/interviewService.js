const prisma = require("../config/database");
const { generateId } = require("../utils/idGenerator");

const stageForType = {
  SCREENING: "SCREENING",
  TECHNICAL: "TECHNICAL",
  MANAGERIAL: "MANAGERIAL",
  HR: "HR",
};

const createInterview = async (data) => {
  const {
    applicationId,
    panelId,
    startTime,
    endTime,
    interviewType,
    meetingLink,
    participants,
  } = data;

  if (
    !applicationId ||
    !panelId ||
    !startTime ||
    !endTime ||
    !interviewType ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    const error = new Error("Missing required interview details");
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start <= new Date() ||
    start >= end
  ) {
    const error = new Error("Invalid interview date or time range");
    error.statusCode = 400;
    throw error;
  }

  if (!stageForType[interviewType]) {
    const error = new Error("Invalid interview type");
    error.statusCode = 400;
    throw error;
  }

  const participantIds = participants.map((p) => p.employeeId);

  if (
    participantIds.some((id) => typeof id !== "string" || !id.trim()) ||
    new Set(participantIds).size !== participantIds.length
  ) {
    const error = new Error("Invalid or duplicate participants");
    error.statusCode = 400;
    throw error;
  }

  if (
    participants.filter((p) => p.role === "LEAD").length !== 1 ||
    participants.some((p) => !["LEAD", "PANELIST", "OBSERVER"].includes(p.role))
  ) {
    const error = new Error(
      "Exactly one LEAD and valid participant roles are required",
    );
    error.statusCode = 400;
    throw error;
  }

  const application = await prisma.application.findUnique({
    where: { applicationId },
    include: { requisition: true },
  });

  if (!application || application.status !== "ACTIVE") {
    const error = new Error("Active application not found");
    error.statusCode = 400;
    throw error;
  }

  if (application.currentStage !== stageForType[interviewType]) {
    const error = new Error(
      `Application must be in ${stageForType[interviewType]} stage`,
    );
    error.statusCode = 400;
    throw error;
  }

  const panel = await prisma.interviewPanel.findUnique({
    where: { panelId },
    include: { members: true },
  });

  if (
    !panel ||
    !panel.isActive ||
    panel.requisitionId !== application.requisitionId
  ) {
    const error = new Error("Invalid or inactive interview panel");
    error.statusCode = 400;
    throw error;
  }

  const panelMemberIds = new Set(
    panel.members.map((member) => member.employeeId),
  );

  if (participantIds.some((id) => !panelMemberIds.has(id))) {
    const error = new Error(
      "All participants must belong to the selected panel",
    );
    error.statusCode = 400;
    throw error;
  }

  const employees = await prisma.employee.findMany({
    where: {
      employeeId: { in: participantIds },
      isActive: true,
    },
  });

  if (employees.length !== participantIds.length) {
    const error = new Error("One or more participants are inactive or missing");
    error.statusCode = 400;
    throw error;
  }

  const interviewId = await generateId("interview", "INT", 2026);

  try {
    return await prisma.$transaction(
      async (tx) => {
        for (const employeeId of participantIds) {
          const availability = await tx.availability.findFirst({
            where: {
              interviewerId: employeeId,
              status: "AVAILABLE",
              startTime: { lte: start },
              endTime: { gte: end },
            },
          });

          if (!availability) {
            const error = new Error(
              `Participant ${employeeId} is not available for this time slot`,
            );
            error.statusCode = 409;
            throw error;
          }
        }

        const conflict = await tx.interview.findFirst({
          where: {
            status: "SCHEDULED",
            startTime: { lt: end },
            endTime: { gt: start },
            participants: {
              some: {
                employeeId: { in: participantIds },
              },
            },
          },
        });

        if (conflict) {
          const error = new Error(
            "An interviewer already has an overlapping scheduled interview",
          );
          error.statusCode = 409;
          throw error;
        }

        const interview = await tx.interview.create({
          data: {
            interviewId,
            applicationId,
            panelId,
            startTime: start,
            endTime: end,
            interviewType,
            meetingLink: meetingLink || null,
            status: "SCHEDULED",
          },
        });

        await tx.interviewParticipant.createMany({
          data: participants.map((participant) => ({
            participantId: require("crypto").randomUUID(),
            interviewId,
            employeeId: participant.employeeId,
            role: participant.role,
          })),
        });

        await tx.auditLog.create({
          data: {
            action: "INTERVIEW_SCHEDULED",
            entityType: "Interview",
            entityId: interviewId,
            details: {
              applicationId,
              panelId,
              participantIds,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
          },
        });

        return tx.interview.findUnique({
          where: { interviewId },
          include: {
            participants: { include: { employee: true } },
            panel: true,
            application: true,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error.code === "P2034") {
      const conflictError = new Error(
        "Scheduling conflict detected. Please retry.",
      );
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

module.exports = { createInterview };
