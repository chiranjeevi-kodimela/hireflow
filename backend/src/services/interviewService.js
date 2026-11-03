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
        // Observers do not require availability.
        for (const participant of participants) {
          if (participant.role === "OBSERVER") continue;

          const availability = await tx.availability.findFirst({
            where: {
              interviewerId: participant.employeeId,
              status: "AVAILABLE",
              startTime: { lte: start },
              endTime: { gte: end },
            },
          });

          if (!availability) {
            const error = new Error(
              `Participant ${participant.employeeId} is not available for this time slot`,
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
                employeeId: {
                  in: participants
                    .filter((p) => p.role !== "OBSERVER")
                    .map((p) => p.employeeId),
                },
                role: { not: "OBSERVER" },
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

        await tx.interview.create({
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
            participantId: `${interviewId}-${participant.employeeId}`,
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

const completeInterview = async (interviewId, data) => {
  const { completedById } = data;

  if (!completedById) {
    const error = new Error("completedById is required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findUnique({
      where: { interviewId },
      include: { participants: true },
    });

    if (!interview) {
      const error = new Error("Interview not found");
      error.statusCode = 404;
      throw error;
    }

    if (interview.status !== "SCHEDULED") {
      const error = new Error("Only scheduled interviews can be completed");
      error.statusCode = 409;
      throw error;
    }

    const participant = interview.participants.find(
      (item) => item.employeeId === completedById && item.role !== "OBSERVER",
    );

    if (!participant) {
      const error = new Error(
        "Only assigned interviewers can complete this interview",
      );
      error.statusCode = 403;
      throw error;
    }

    await tx.interview.update({
      where: { interviewId },
      data: { status: "COMPLETED" },
    });

    await tx.auditLog.create({
      data: {
        actorId: completedById,
        action: "INTERVIEW_COMPLETED",
        entityType: "Interview",
        entityId: interviewId,
        details: {
          previousStatus: "SCHEDULED",
          newStatus: "COMPLETED",
        },
      },
    });

    return tx.interview.findUnique({
      where: { interviewId },
      include: { participants: true, application: true },
    });
  });
};

const cancelInterview = async (interviewId, data) => {
  const { cancelledById, reason } = data;

  if (!cancelledById || !reason?.trim()) {
    const error = new Error(
      "cancelledById and cancellation reason are required",
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findUnique({
      where: { interviewId },
      include: { participants: true },
    });

    if (!interview) {
      const error = new Error("Interview not found");
      error.statusCode = 404;
      throw error;
    }

    if (interview.status !== "SCHEDULED") {
      const error = new Error("Only scheduled interviews can be cancelled");
      error.statusCode = 409;
      throw error;
    }

    const participant = interview.participants.find(
      (item) => item.employeeId === cancelledById && item.role !== "OBSERVER",
    );

    if (!participant) {
      const error = new Error(
        "Only assigned interviewers can cancel this interview",
      );
      error.statusCode = 403;
      throw error;
    }

    await tx.interview.update({
      where: { interviewId },
      data: { status: "CANCELLED" },
    });

    await tx.auditLog.create({
      data: {
        actorId: cancelledById,
        action: "INTERVIEW_CANCELLED",
        entityType: "Interview",
        entityId: interviewId,
        details: {
          previousStatus: "SCHEDULED",
          newStatus: "CANCELLED",
          reason: reason.trim(),
          previousStartTime: interview.startTime,
          previousEndTime: interview.endTime,
        },
      },
    });

    return tx.interview.findUnique({
      where: { interviewId },
      include: { participants: true, application: true },
    });
  });
};

const rescheduleInterview = async (interviewId, data) => {
  const { rescheduledById, startTime, endTime, reason } = data;

  if (!rescheduledById || !startTime || !endTime || !reason?.trim()) {
    const error = new Error(
      "rescheduledById, startTime, endTime and reason are required",
    );
    error.statusCode = 400;
    throw error;
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  if (
    Number.isNaN(newStart.getTime()) ||
    Number.isNaN(newEnd.getTime()) ||
    newStart <= new Date() ||
    newStart >= newEnd
  ) {
    const error = new Error("Invalid interview date or time range");
    error.statusCode = 400;
    throw error;
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const interview = await tx.interview.findUnique({
          where: { interviewId },
          include: { participants: true },
        });

        if (!interview) {
          const error = new Error("Interview not found");
          error.statusCode = 404;
          throw error;
        }

        if (interview.status !== "SCHEDULED") {
          const error = new Error(
            "Only scheduled interviews can be rescheduled",
          );
          error.statusCode = 409;
          throw error;
        }

        const participant = interview.participants.find(
          (item) =>
            item.employeeId === rescheduledById && item.role !== "OBSERVER",
        );

        if (!participant) {
          const error = new Error(
            "Only assigned interviewers can reschedule this interview",
          );
          error.statusCode = 403;
          throw error;
        }

        const activeParticipants = interview.participants.filter(
          (item) => item.role !== "OBSERVER",
        );

        for (const item of activeParticipants) {
          const available = await tx.availability.findFirst({
            where: {
              interviewerId: item.employeeId,
              status: "AVAILABLE",
              startTime: { lte: newStart },
              endTime: { gte: newEnd },
            },
          });

          if (!available) {
            const error = new Error(
              `Interviewer ${item.employeeId} is not available at the requested time`,
            );
            error.statusCode = 409;
            throw error;
          }
        }

        const conflict = await tx.interview.findFirst({
          where: {
            interviewId: { not: interviewId },
            status: "SCHEDULED",
            startTime: { lt: newEnd },
            endTime: { gt: newStart },
            participants: {
              some: {
                employeeId: {
                  in: activeParticipants.map((item) => item.employeeId),
                },
                role: { not: "OBSERVER" },
              },
            },
          },
        });

        if (conflict) {
          const error = new Error(
            "An interviewer already has another interview at this time",
          );
          error.statusCode = 409;
          throw error;
        }

        await tx.interview.update({
          where: { interviewId },
          data: {
            startTime: newStart,
            endTime: newEnd,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: rescheduledById,
            action: "INTERVIEW_RESCHEDULED",
            entityType: "Interview",
            entityId: interviewId,
            details: {
              reason: reason.trim(),
              previousStartTime: interview.startTime,
              previousEndTime: interview.endTime,
              newStartTime: newStart,
              newEndTime: newEnd,
            },
          },
        });

        return tx.interview.findUnique({
          where: { interviewId },
          include: { participants: true, application: true },
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

const getAllInterviews = async (filters = {}) => {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.interviewType) where.interviewType = filters.interviewType;
  if (filters.applicationId) where.applicationId = filters.applicationId;

  return prisma.interview.findMany({
    where,
    include: {
      application: {
        include: {
          candidate: true,
          requisition: true,
        },
      },
      panel: true,
      participants: {
        include: {
          employee: true,
        },
      },
      scorecards: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });
};

module.exports = {
  createInterview,
  completeInterview,
  cancelInterview,
  rescheduleInterview,
  getAllInterviews,
};
