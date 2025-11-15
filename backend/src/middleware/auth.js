const admin = require("../firebaseAdmin");
const dotenv = require("dotenv");
dotenv.config();

async function authMiddleware(req, res, next) {
  console.log("👉 authMiddleware hit");

  try {
    const header = req.headers.authorization;
    console.log("Authorization:", header);

    if (!header) {
      console.log("❌ No auth header");
      return res.status(401).json({ error: "No auth header" });
    }

    const token = header.split(" ")[1];
    console.log("Token extracted:", token ? "YES" : "NO");

    const decoded = await admin.auth().verifyIdToken(token);
    console.log("🔥 Decoded token:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.log("❌ AUTH MIDDLEWARE ERROR:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// requireAdmin: checks Firestore user profile for role === 'admin'
async function requireAdmin(req, res, next) {
  try {
    // authMiddleware should have already populated req.user
    const uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const USERS_COLLECTION = process.env.USERS_COLLECTION || "users";
    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      console.log(`User profile not found for uid=${uid}`);
      return res.status(403).json({ error: "Forbidden" });
    }

    const profile = snap.data();
    if (profile && profile.role === "admin") {
      return next();
    }

    console.log(`User uid=${uid} is not admin (role=${profile && profile.role})`);
    return res.status(403).json({ error: "Forbidden: admin only" });
  } catch (err) {
    console.error("❌ requireAdmin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { authMiddleware, requireAdmin };
