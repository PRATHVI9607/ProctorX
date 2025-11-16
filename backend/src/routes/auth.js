const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const admin = require("../firebaseAdmin");

router.get("/me", authMiddleware, async (req, res) => {
  console.log("");
  console.log("🔥🔥🔥 /auth/me triggered");

  try {
    console.log("Decoded token received in /auth/me:", req.user);

    const uid = req.user?.uid;
    const email = req.user?.email;

    console.log("UID:", uid);
    console.log("Email:", email);

    if (!uid || !email) {
      console.log("❌ INVALID TOKEN — UID or Email missing");
      return res.status(400).json({ error: "Invalid Firebase token" });
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    const snap = await userRef.get();

    if (snap.exists) {
      console.log("✔ Profile already exists.");
      return res.json({ user: { uid, email, profile: snap.data() } });
    }

    console.log("⚠ No profile found. Creating student profile...");

    const newProfile = {
      email,
      role: "student",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(newProfile);

    console.log("✔ NEW PROFILE CREATED (serverTimestamp):", newProfile);

    const createdSnap = await userRef.get();
    res.json({ user: { uid, email, profile: { id: createdSnap.id, ...createdSnap.data() } } });
  } catch (err) {
    console.error("🔥 ERROR in /auth/me:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// Update or create student profile
router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    let { name, year, department, role } = req.body || {};
    
    // Normalize and validate inputs
    department = department ? String(department).toLowerCase().trim() : undefined;
    year = year !== undefined ? Number(year) : undefined;
    if (year !== undefined && Number.isNaN(year)) year = undefined;

    console.log("📝 Updating profile for UID:", uid);
    console.log("   name:", name);
    console.log("   year:", year);
    console.log("   department:", department);
    console.log("   role:", role);

    const userRef = admin.firestore().collection("users").doc(uid);

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined && name !== "") updateData.name = name;
    if (year !== undefined && !Number.isNaN(year)) updateData.year = year;
    if (department !== undefined && department !== "") updateData.department = department;
    if (role !== undefined) updateData.role = role;

    await userRef.set(updateData, { merge: true });

    const snap = await userRef.get();
    console.log("✔ Profile updated successfully:", snap.data());
    
    return res.json({ profile: { id: snap.id, ...snap.data() } });
  } catch (err) {
    console.error("🔥 ERROR in /auth/profile:", err);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

module.exports = router;