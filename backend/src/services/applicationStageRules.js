const interviewTypeForNextStage = {
  TECHNICAL: "SCREENING",
  MANAGERIAL: "TECHNICAL",
  HR: "MANAGERIAL",
  OFFER: "HR",
};

const getRequiredInterviewType = (toStage) =>
  interviewTypeForNextStage[toStage];

const getStageGateError = (toStage, interviews, hasAcceptedOffer) => {
  if (toStage === "HIRED") {
    return hasAcceptedOffer
      ? null
      : "An accepted offer is required before marking the application hired";
  }

  const requiredInterviewType = getRequiredInterviewType(toStage);

  if (!requiredInterviewType) return null;

  const requiredInterviews = interviews.filter(
    (interview) =>
      interview.interviewType === requiredInterviewType &&
      interview.status !== "CANCELLED",
  );

  if (requiredInterviews.length === 0) {
    return `A completed ${requiredInterviewType.toLowerCase()} interview and review are required`;
  }

  for (const interview of requiredInterviews) {
    if (interview.status !== "COMPLETED") {
      return `All ${requiredInterviewType.toLowerCase()} interviews must be completed before advancing`;
    }

    const requiredReviewerIds = interview.participants
      .filter((participant) => participant.role !== "OBSERVER")
      .map((participant) => participant.employeeId);
    const submittedReviewerIds = new Set(
      interview.scorecards.map((scorecard) => scorecard.reviewerId),
    );

    if (
      requiredReviewerIds.length === 0 ||
      requiredReviewerIds.some((reviewerId) => !submittedReviewerIds.has(reviewerId))
    ) {
      return `Every assigned ${requiredInterviewType.toLowerCase()} interviewer must submit a scorecard before advancing`;
    }
  }

  return null;
};

module.exports = { getRequiredInterviewType, getStageGateError };
