const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed.");
  }

  return result.data;
}

export async function getRequisitions() {
  const data = await request("/requisitions");
  return Array.isArray(data) ? data : data?.requisitions || [];
}

export async function getHiringManagers() {
  const data = await request("/hiring-managers");
  return Array.isArray(data) ? data : [];
}

export async function createRequisition(payload) {
  return request("/requisitions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitRequisition(requisitionId, submittedById) {
  return request(`/requisition-approvals/${requisitionId}/submit`, {
    method: "POST",
    body: JSON.stringify({ submittedById }),
  });
}
