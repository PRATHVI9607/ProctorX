const admin = require("./src/firebaseAdmin");

async function test() {
  console.log("🔥 TESTING FIREBASE ADMIN SDK");

  console.log("Project ID:", admin.app().options.projectId);

  try {
    const db = admin.firestore();
    await db.collection("debug_test").add({ ping: "ok", time: Date.now() });

    console.log("✔ Firestore write SUCCESS");
  } catch (err) {
    console.error("❌ Firestore write FAILED:", err);
  }
}

test();
