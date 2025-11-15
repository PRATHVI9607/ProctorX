// backend/src/routes/auth.js
const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth");
const admin = require("../firebaseAdmin");

// GET logged-in user details
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Fetch Firestore profile
    const userDoc = await admin.firestore().collection("users").doc(uid).get();

    let userData = {
      uid,
      email: req.user.email,
      role: "student", // default fallback
    };

    if (userDoc.exists) {
      const data = userDoc.data();
      userData.role = data.role || "student";
      userData.profile = data;
    }

    return res.json({ user: userData });
  } catch (err) {
    console.error("ERROR /auth/me:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
