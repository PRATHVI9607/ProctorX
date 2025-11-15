// frontend/src/services/questionService.js
import { API_BASE_URL } from "../utils/config";
import { getIdToken } from "../utils/auth";

async function authHeaders() {
  const token = await getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchQuestions(filter = {}) {
  const params = new URLSearchParams(filter).toString();
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/questions?${params}`, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to load questions");
  return res.json();
}

export async function createQuestion(question) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers,
    body: JSON.stringify(question),
  });
  if (!res.ok) throw new Error("Failed to create question");
  return res.json();
}

export async function updateQuestion(id, data) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update question");
  return res.json();
}

export async function deleteQuestion(id) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete question");
  return res.json();
}
