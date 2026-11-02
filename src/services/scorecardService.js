const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (url, options = {}) => {
  const response = await fetch(`${API_URL}${url}`, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
};

export const getCompletedInterviews = async () => {
  const interviews = await request("/interviews");
  return (interviews || []).filter(
    (interview) => interview.status === "COMPLETED",
  );
};

export const getEvaluationCriteria = async (requisitionId) => {
  return request(
    `/evaluation-criteria?requisitionId=${encodeURIComponent(requisitionId)}`,
  );
};

export const createScorecard = async (scorecardData) => {
  return request("/scorecards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(scorecardData),
  });
};
