// backend/src/models/Question.js
const admin = require("../firebaseAdmin");

const COLLECTION = "questions";

// ➤ CREATE QUESTION
async function createQuestion(data) {
  const ref = await admin.firestore().collection(COLLECTION).add({
    ...data,
    createdAt: Date.now()
  });

  return { id: ref.id, ...data };
}

// ➤ FILTER QUESTIONS
async function getQuestionsByFilter(filter) {
  let query = admin.firestore().collection(COLLECTION);

  if (filter.section) query = query.where("section", "==", filter.section);
  if (filter.year) query = query.where("year", "==", filter.year);
  if (filter.department)
    query = query.where("department", "==", filter.department);

  const snap = await query.get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ➤ UPDATE QUESTION
async function updateQuestion(id, data) {
  await admin.firestore().collection(COLLECTION).doc(id).update(data);
  return { id, ...data };
}

// ➤ DELETE QUESTION
async function deleteQuestion(id) {
  await admin.firestore().collection(COLLECTION).doc(id).delete();
}

module.exports = {
  createQuestion,
  getQuestionsByFilter,
  updateQuestion,
  deleteQuestion,
};
