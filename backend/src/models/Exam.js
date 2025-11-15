// backend/src/models/Exam.js
const admin = require("../firebaseAdmin");
const dotenv = require("dotenv");
dotenv.config();

const db = admin.firestore();
const EXAMS_COLLECTION = process.env.EXAMS_COLLECTION || "exams";

async function createExam(data) {
  // normalize department and section to lowercase to make matching case-insensitive
  const normalized = {
    ...data,
    year: data.year !== undefined ? Number(data.year) : data.year,
    department: data.department ? String(data.department).toLowerCase().trim() : "general",
    section: data.section ? String(data.section).toLowerCase().trim() : "general",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(EXAMS_COLLECTION).add(normalized);
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
  const y = Number(year);
  let q = db.collection(EXAMS_COLLECTION).where("year", "==", y);

  // Normalize department for query
  const deptNormalized = department ? String(department).toLowerCase().trim() : "general";

  // First years should only see 'general' department exams.
  if (y === 1) {
    q = q.where("department", "==", "general");
  } else {
    // For other years, include exams targeted to their department or general
    q = q.where("department", "in", [deptNormalized, "general"]);
  }

  const snap = await q.get();

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((exam) => {
      const start = exam.startTime && exam.startTime.toDate ? exam.startTime.toDate() : new Date(exam.startTime);
      const end = exam.endTime && exam.endTime.toDate ? exam.endTime.toDate() : new Date(exam.endTime);
      const isLive = now >= start && now <= end;
      const isUpcoming = now < start;
      const status = isLive ? "live" : isUpcoming ? "upcoming" : "ended";
      return { ...exam, isLive, isUpcoming, status };
    });
}

async function getExamById(id) {
  const ref = db.collection(EXAMS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
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
        // Use a concrete Timestamp here; serverTimestamp() cannot be used inside arrayUnion
        time: admin.firestore.Timestamp.now(),
      }),
      // When a violation occurs, pause the session and mark it as awaiting approval
      status: "paused",
      awaitingApproval: true,
    },
    { merge: true }
  );
  const snap = await sessionRef.get();
  return { id: snap.id, ...snap.data() };
}

async function approveSession(examId, userId, approverId, approve = true, note = null) {
  const sessionRef = db
    .collection(EXAMS_COLLECTION)
    .doc(examId)
    .collection("sessions")
    .doc(userId);

  const approvalRecord = {
    approverId,
    approved: !!approve,
    note: note || "",
    // Use a concrete Timestamp here; FieldValue.serverTimestamp() is not allowed inside arrays
    time: admin.firestore.Timestamp.now(),
  };

  await sessionRef.set(
    {
      approvals: admin.firestore.FieldValue.arrayUnion(approvalRecord),
      awaitingApproval: false,
      status: approve ? "ongoing" : "blocked",
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
  approveSession,
  listSessions,
};
