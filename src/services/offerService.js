const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
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
}

export function getOffers() {
  return request("/offers");
}

export function createOffer(payload) {
  return request("/offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function decideApproval(approvalId, payload) {
  return request(`/approvals/${encodeURIComponent(approvalId)}/decision`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function sendOffer(offerId) {
  return request(`/offers/${encodeURIComponent(offerId)}/send`, {
    method: "PATCH",
  });
}

export function respondToOffer(offerId, payload) {
  return request(`/offers/${encodeURIComponent(offerId)}/respond`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function withdrawOffer(offerId, reason) {
  return request(`/offers/${encodeURIComponent(offerId)}/withdraw`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function getEmployees() {
  return request("/employees");
}
