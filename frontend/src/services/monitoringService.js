// frontend/src/services/monitoringService.js
import { API_BASE_URL } from "../utils/config";
import { getIdToken } from "../utils/auth";

async function authHeaders() {
  const token = await getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function reportViolation(examId, reason) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/exams/${examId}/violation`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to report violation");
  return res.json();
}

export async function fetchExamSessions(examId) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/exams/${examId}/sessions`, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}
