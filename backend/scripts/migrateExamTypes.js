// backend/scripts/migrateExamTypes.js
// Fixes existing exam documents to ensure numeric fields are stored as numbers
const admin = require('../src/firebaseAdmin');

async function main() {
  const db = admin.firestore();
  const examsRef = db.collection('exams');
  const snap = await examsRef.get();
  console.log('Found', snap.size, 'exam documents');
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const updates = {};
    if (data.year && typeof data.year === 'string') updates.year = Number(data.year);
    if (data.durationMinutes && typeof data.durationMinutes === 'string') updates.durationMinutes = Number(data.durationMinutes);
    if (data.randomQuestionCount && typeof data.randomQuestionCount === 'string') updates.randomQuestionCount = Number(data.randomQuestionCount);
    if (Object.keys(updates).length > 0) {
      await examsRef.doc(d.id).set(updates, { merge: true });
      console.log('Updated', d.id, updates);
      updated++;
    }
  }
  console.log('Migration complete. Updated', updated, 'documents');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
