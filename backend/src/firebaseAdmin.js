// backend/src/firebaseAdmin.js
const admin = require("firebase-admin");
const path = require("path");

// Correct absolute path to serviceAccountKey.json
const serviceAccount = require(path.join(__dirname, "..", "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
