// backend/src/routes/questions.js
const express = require("express");
const router = express.Router();
const { authMiddleware, requireAdmin } = require("../middleware/auth");

const QuestionModel = require("../models/Question");

const {
  createQuestion,
  getQuestionsByFilter,
  updateQuestion,
  deleteQuestion,
} = QuestionModel;

// DEBUG LOG
console.log("Loaded QuestionModel:", QuestionModel);

// CREATE QUESTION
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const data = await createQuestion(req.body);
    res.json(data);
  } catch (err) {
    console.error("❌ Error creating question:", err);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// GET QUESTIONS
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const filter = {
      section: req.query.section,
      year: req.query.year,
      department: req.query.department,
    };
    const list = await getQuestionsByFilter(filter);
    res.json(list);
  } catch (err) {
    console.error("❌ Fetch questions error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// UPDATE
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await updateQuestion(req.params.id, req.body);
    res.json({ message: "Updated" });
  } catch (err) {
    console.error("❌ Update question error:", err);
    res.status(500).json({ error: "Failed to update question" });
  }
});

// DELETE
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await deleteQuestion(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("❌ Delete question error:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
});

module.exports = router;
