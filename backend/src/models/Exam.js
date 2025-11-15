// backend/src/models/Exam.js
const admin = require("../firebaseAdmin");
const dotenv = require("dotenv");
dotenv.config();

const db = admin.firestore();
const EXAMS_COLLECTION = process.env.EXAMS_COLLECTION || "exams";

async function createExam(data) {
  const ref = await db.collection(EXAMS_COLLECTION).add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return { id: ref.id, ...snap.data() };
}

async function listExamsForAdmin() {
  const now = new Date();
  const snap = await db.collection(EXAMS_COLLECTION).get();
  return snap.docs.map((d) => {
    const data = { id: d.id, ...d.data() };
    const start = data.startTime && data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
    const end = data.endTime && data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
    return { ...data, isLive: now >= start && now <= end };
  });
}

async function listExamsForStudent(year, department) {
  const now = new Date();
  const snap = await db
    .collection(EXAMS_COLLECTION)
    .where("year", "==", year)
    .where("department", "in", [department, "general"])
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((exam) => {
      const start = exam.startTime && exam.startTime.toDate ? exam.startTime.toDate() : new Date(exam.startTime);
      const end = exam.endTime && exam.endTime.toDate ? exam.endTime.toDate() : new Date(exam.endTime);
      const isLive = now >= start && now <= end;
      const isUpcoming = now < start;
      const status = isLive ? "live" : isUpcoming ? "upcoming" : "ended";
      // return ISO strings for client-friendly serialization
      return { ...exam, isLive, isUpcoming, status, startTime: start.toISOString(), endTime: end.toISOString() };
    });
}

async function getExamById(id) {
  const ref = db.collection(EXAMS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  const start = data.startTime && data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
  const end = data.endTime && data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
  return { id: snap.id, ...data, startTime: start.toISOString(), endTime: end.toISOString() };
}

async function createOrGetSession(examId, userId, data = {}) {
  const sessionRef = db
    .collection(EXAMS_COLLECTION)
    .doc(examId)
    .collection("sessions")
    .doc(userId);

  const snap = await sessionRef.get();
  if (snap.exists) {
    return { id: snap.id, ...snap.data() };
  }

  await sessionRef.set({
    userId,
    status: "ongoing",
    violations: [],
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...data,
  });

  const newSnap = await sessionRef.get();
  return { id: newSnap.id, ...newSnap.data() };
}

async function submitSession(examId, userId, answers) {
  const sessionRef = db
    .collection(EXAMS_COLLECTION)
    .doc(examId)
    .collection("sessions")
    .doc(userId);

  await sessionRef.set(
    {
      status: "submitted",
      answers,
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const snap = await sessionRef.get();
  return { id: snap.id, ...snap.data() };
}

async function addViolation(examId, userId, reason) {
  const sessionRef = db
    .collection(EXAMS_COLLECTION)
    .doc(examId)
    .collection("sessions")
    .doc(userId);

  await sessionRef.set(
    {
      violations: admin.firestore.FieldValue.arrayUnion({
        reason,
        time: admin.firestore.FieldValue.serverTimestamp(),
      }),
    },
    { merge: true }
  );
  const snap = await sessionRef.get();
  return { id: snap.id, ...snap.data() };
}

async function listSessions(examId) {
  const snap = await db
    .collection(EXAMS_COLLECTION)
    .doc(examId)
    .collection("sessions")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = {
  createExam,
  listExamsForAdmin,
  listExamsForStudent,
  getExamById,
  createOrGetSession,
  submitSession,
  addViolation,
  listSessions,
};
