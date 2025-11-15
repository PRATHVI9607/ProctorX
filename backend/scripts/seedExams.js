// backend/scripts/seedExams.js
// Creates sample exams in the Firestore `exams` collection for development/testing.
const admin = require('../src/firebaseAdmin');

async function main() {
  const db = admin.firestore();
  const EXAMS_COLLECTION = process.env.EXAMS_COLLECTION || 'exams';

  const now = new Date();

  const samples = [
    {
      name: 'CS Algorithms - Midterm',
      year: 3,
      department: 'cs',
      section: 'A',
      durationMinutes: 60,
      startTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 5 * 60 * 1000)), // started 5 minutes ago
      endTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + 55 * 60 * 1000)), // ends in 55 minutes
      randomQuestionCount: 10,
      createdBy: process.env.SEED_ADMIN_UID || 'seed-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      name: 'ECE Signal Processing - Quiz',
      year: 2,
      department: 'ece',
      section: 'B',
      durationMinutes: 30,
      startTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)), // 2 days from now
      endTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)),
      randomQuestionCount: 5,
      createdBy: process.env.SEED_ADMIN_UID || 'seed-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      name: 'General Ethics - Past Paper',
      year: 1,
      department: 'general',
      section: 'All',
      durationMinutes: 45,
      startTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
      endTime: admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000)),
      randomQuestionCount: 0,
      createdBy: process.env.SEED_ADMIN_UID || 'seed-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  console.log('Seeding', samples.length, 'exams into collection', EXAMS_COLLECTION);

  for (const s of samples) {
    const ref = await db.collection(EXAMS_COLLECTION).add(s);
    console.log('Created exam', ref.id, s.name);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
