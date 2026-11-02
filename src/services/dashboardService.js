const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getDashboardSummary() {
  const response = await fetch(`${API_URL}/dashboard/summary`);

  if (!response.ok) {
    throw new Error("Failed to load dashboard data");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Dashboard request failed");
  }

  return result.data;
}
