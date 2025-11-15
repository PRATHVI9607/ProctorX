const admin = require('../src/firebaseAdmin');

async function main() {
  console.log('Listing users (up to 1000)');
  const result = await admin.auth().listUsers(1000);
  const users = result.users || [];
  const targets = users.filter(u => u.email && u.email.endsWith('@example.com'));
  console.log('Found', targets.length, "users with @example.com to delete");

  for (const u of targets) {
    try {
      console.log('Deleting auth user:', u.email, u.uid);
      await admin.auth().deleteUser(u.uid);
    } catch (e) {
      console.warn('Failed to delete auth user', u.email, e.message);
    }
    try {
      const docRef = admin.firestore().collection('users').doc(u.uid);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.delete();
        console.log('Deleted Firestore users doc for', u.email);
      }
    } catch (e) {
      console.warn('Failed to delete users doc for', u.email, e.message);
    }
  }

  console.log('Cleanup complete');
}

main().catch(err => { console.error('Cleanup failed', err); process.exit(1); });
