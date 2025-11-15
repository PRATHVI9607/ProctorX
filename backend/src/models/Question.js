// backend/src/models/Question.js
const admin = require("../firebaseAdmin");
const db = admin.firestore();

const QUESTIONS = db.collection("questions");

// Create
async function createQuestion(data) {
  const ref = await QUESTIONS.add({
    ...data,
    createdAt: Date.now(),
  });
  return { id: ref.id, ...data };
}

// Filter
async function getQuestionsByFilter(filter) {
  let q = QUESTIONS;

  if (filter.section) q = q.where("section", "==", filter.section);
  if (filter.year) q = q.where("year", "==", Number(filter.year));
  if (filter.department) q = q.where("department", "==", filter.department);

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
