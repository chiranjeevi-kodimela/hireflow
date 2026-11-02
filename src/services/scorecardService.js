const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !result.success) {
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
    body: JSON.stringify(scorecardData),
  });
};
