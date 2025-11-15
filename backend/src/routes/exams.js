// backend/src/routes/exams.js
const express = require("express");
const router = express.Router();
const { authMiddleware, requireAdmin } = require("../middleware/auth");
const {
  createExam,
  listExamsForAdmin,
  listExamsForStudent,
  getExamById,
  createOrGetSession,
  submitSession,
  addViolation,
  listSessions,
} = require("../models/Exam");
const {
  getQuestionsByFilter,
} = require("../models/Question");

// Admin: create exam
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      year,
      department,
      section,
      durationMinutes,
      startTime,
      endTime,
      randomQuestionCount,
    } = req.body;

    const exam = await createExam({
      name,
      year,
      department,
      section,
      durationMinutes,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      randomQuestionCount,
      createdBy: req.user.uid,
    });

    res.json(exam);
  } catch (err) {
    console.error("Create exam error:", err);
    res.status(500).json({ message: "Failed to create exam" });
  }
});

// Admin: list all exams
router.get("/admin", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const exams = await listExamsForAdmin();
    res.json(exams);
  } catch (err) {
    console.error("List admin exams error:", err);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
});

// Student: list available exams
router.get("/student", authMiddleware, async (req, res) => {
  try {
    const { year, department } = req.user;
    if (!year || !department) {
      return res
        .status(400)
        .json({ message: "User profile (year, department) not set" });
    }
    const exams = await listExamsForStudent(year, department);
    res.json(exams);
  } catch (err) {
    console.error("List student exams error:", err);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
});

// Student: start exam (create session + random questions)
router.post("/:examId/start", authMiddleware, async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user.uid;

    const exam = await getExamById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const now = new Date();
    const start = exam.startTime.toDate ? exam.startTime.toDate() : new Date(exam.startTime);
    const end = exam.endTime.toDate ? exam.endTime.toDate() : new Date(exam.endTime);

    if (now < start || now > end) {
      return res.status(400).json({ message: "Exam not active" });
    }

    const questions = await getQuestionsByFilter({
      section: exam.section,
      year: exam.year,
      department: exam.department === "general" ? undefined : exam.department,
    });

    // Randomly pick
    const randomCount = Math.min(exam.randomQuestionCount || questions.length, questions.length);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, randomCount);

    const session = await createOrGetSession(examId, userId, {
      questions: selected,
    });

    res.json({
      exam,
      session,
    });
  } catch (err) {
    console.error("Start exam error:", err);
    res.status(500).json({ message: "Failed to start exam" });
  }
});

// Student: submit exam
router.post("/:examId/submit", authMiddleware, async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user.uid;
    const { answers } = req.body;

    const session = await submitSession(examId, userId, answers);
    res.json(session);
  } catch (err) {
    console.error("Submit exam error:", err);
    res.status(500).json({ message: "Failed to submit exam" });
  }
});

// Student: report violation (fullscreen exit, tab change, shortcut)
router.post("/:examId/violation", authMiddleware, async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user.uid;
    const { reason } = req.body;
    const session = await addViolation(examId, userId, reason || "Unknown");
    res.json(session);
  } catch (err) {
    console.error("Violation error:", err);
    res.status(500).json({ message: "Failed to record violation" });
  }
});

// Admin: list sessions for monitoring
router.get("/:examId/sessions", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const examId = req.params.examId;
    const sessions = await listSessions(examId);
    res.json(sessions);
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

module.exports = router;
