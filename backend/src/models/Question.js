// backend/src/models/Question.js
const admin = require("../firebaseAdmin");
const db = admin.firestore();

const QUESTIONS = db.collection("questions");

// Create
async function createQuestion(data) {
  const normalized = {
    ...data,
    year: data.year !== undefined ? Number(data.year) : data.year,
    department: data.department ? String(data.department).toLowerCase().trim() : "general",
    section: data.section ? String(data.section).toLowerCase().trim() : "general",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await QUESTIONS.add(normalized);
  const snap = await ref.get();
  return { id: ref.id, ...snap.data() };
}

// Filter
async function getQuestionsByFilter(filter) {
  let q = QUESTIONS;

  if (filter.section) q = q.where("section", "==", filter.section);
  if (filter.year) q = q.where("year", "==", Number(filter.year));
  if (filter.department) {
    // allow department to be a single value or an array (e.g., ['cse','general'])
    if (Array.isArray(filter.department)) {
      q = q.where('department', 'in', filter.department);
    } else {
      q = q.where('department', '==', filter.department);
    }
  }

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Update
async function updateQuestion(id, updates) {
  await QUESTIONS.doc(id).update(updates);
  return true;
}

// Delete
async function deleteQuestion(id) {
  await QUESTIONS.doc(id).delete();
  return true;
}

module.exports = {
  createQuestion,
  getQuestionsByFilter,
  updateQuestion,
  deleteQuestion,
};
