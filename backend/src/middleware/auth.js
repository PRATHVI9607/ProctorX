// backend/src/middleware/auth.js
const admin = require("../firebaseAdmin");

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = header.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email
    };

    next();
  } catch (err) {
    console.error("Auth Error:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    const snap = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();

    if (!snap.exists || snap.data().role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (err) {
    console.error("requireAdmin Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { authMiddleware, requireAdmin };
