// backend/src/routes/questions.js
const express = require("express");
const router = express.Router();

const { authMiddleware, requireAdmin } = require("../middleware/auth");
const {
  createQuestion,
  getQuestionsByFilter,
  deleteQuestion,
  updateQuestion
} = require("../models/Question");

// ➤ CREATE question
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await createQuestion({
      ...req.body,
      createdBy: req.user.uid,
    });
    res.json(result);
  } catch (err) {
    console.error("Create question error:", err);
    res.status(500).json({ message: "Failed to create question" });
  }
});

// ➤ LIST / FILTER questions
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const filter = {};

    if (req.query.section) filter.section = req.query.section;
    if (req.query.year) filter.year = req.query.year;
    if (req.query.department) filter.department = req.query.department;

    const list = await getQuestionsByFilter(filter);
    res.json(list);
  } catch (err) {
    console.error("Get questions error:", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

// ➤ UPDATE question
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const updated = await updateQuestion(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("Update question error:", err);
    res.status(500).json({ message: "Failed to update question" });
  }
});

// ➤ DELETE question
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await deleteQuestion(req.params.id);
    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error("Delete question error:", err);
    res.status(500).json({ message: "Failed to delete question" });
  }
});

module.exports = router;
