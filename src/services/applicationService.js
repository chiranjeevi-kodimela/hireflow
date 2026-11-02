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

export async function getApplications() {
  return request("/applications");
}

export async function createApplication(payload) {
  return request("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getApplicationById(id) {
  return request(`/applications/${id}`);
}
