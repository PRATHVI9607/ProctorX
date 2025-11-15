// backend/src/models/User.js
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const db = admin.firestore();
const USERS_COLLECTION = process.env.USERS_COLLECTION || "users";

async function upsertUserProfile(uid, profile) {
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  await ref.set(
    {
      ...profile,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() };
}

async function getUserProfile(uid) {
  const ref = db.collection(USERS_COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = {
  upsertUserProfile,
  getUserProfile,
};
