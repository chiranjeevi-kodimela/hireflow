const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getAvailability = async (interviewerId) => {
  const response = await fetch(`${API_URL}/availability/${interviewerId}`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch availability");
  }

  return result.data;
};

export const createAvailability = async (availabilityData) => {
  const response = await fetch(`${API_URL}/availability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(availabilityData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create availability");
  }

  return result.data;
};
