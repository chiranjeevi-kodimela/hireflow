const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
}

export async function getInterviews(filters = {}) {
  const params = new URLSearchParams();

  if (filters.status) params.append("status", filters.status);
  if (filters.interviewType) {
    params.append("interviewType", filters.interviewType);
  }

  const query = params.toString();

  return request(`/interviews${query ? `?${query}` : ""}`);
}

export async function createInterview(payload) {
  return request("/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeInterview(id, payload) {
  return request(`/interviews/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelInterview(id, payload) {
  return request(`/interviews/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function rescheduleInterview(id, payload) {
  return request(`/interviews/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getEmployees() {
  return request("/employees");
}

export async function getInterviewPanels(requisitionId) {
  const params = new URLSearchParams();

  if (requisitionId) params.append("requisitionId", requisitionId);

  const query = params.toString();

  return request(`/interview-panels${query ? `?${query}` : ""}`);
}
