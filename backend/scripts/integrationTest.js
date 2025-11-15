const path = require('path');
const fs = require('fs');
const fetch = global.fetch || require('node-fetch');

const admin = require('../src/firebaseAdmin');

// Helper to read frontend env file for API key
function readFrontendApiKey() {
  const envPath = path.resolve(__dirname, '../../frontend/.env.development');
  if (!fs.existsSync(envPath)) throw new Error('.env.development not found');
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/REACT_APP_FIREBASE_API_KEY\s*=\s*(.*)/);
  if (!match) throw new Error('API key not found in frontend/.env.development');
  return match[1].trim();
}

async function createOrGetUser(email, password) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('Found existing user', email);
    return user;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log('Creating user', email);
      return await admin.auth().createUser({ email, password });
    }
    throw e;
  }
}

async function exchangeCustomTokenForIdToken(customToken, apiKey) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error('Token exchange failed: ' + JSON.stringify(body));
  return body.idToken;
}

async function callApi(method, url, idToken, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: idToken ? `Bearer ${idToken}` : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function main() {
  const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
  const apiKey = readFrontendApiKey();

  console.log('Using API base:', API_BASE);
  console.log('Using Firebase API key from frontend env');

  // Test accounts
  const adminEmail = 'test_admin@example.com';
  const studentEmail = 'test_student@example.com';
  const password = 'Test1234!';

  // Create or get users
  const adminUser = await createOrGetUser(adminEmail, password);
  const studentUser = await createOrGetUser(studentEmail, password);

  // Ensure admin has role in Firestore
  const usersRef = admin.firestore().collection('users');
  await usersRef.doc(adminUser.uid).set({ role: 'admin', email: adminEmail }, { merge: true });
  console.log('Set admin role in Firestore for', adminEmail);

  // Exchange custom tokens for idTokens
  const adminCustom = await admin.auth().createCustomToken(adminUser.uid);
  const studentCustom = await admin.auth().createCustomToken(studentUser.uid);
  const adminIdToken = await exchangeCustomTokenForIdToken(adminCustom, apiKey);
  const studentIdToken = await exchangeCustomTokenForIdToken(studentCustom, apiKey);
  console.log('Exchanged tokens for idTokens');

  // Student: POST /auth/profile
  const profileBody = { name: 'Test Student', year: 1, department: 'cse' };
  const profileResp = await callApi('POST', `${API_BASE}/auth/profile`, studentIdToken, profileBody);
  console.log('/auth/profile ->', profileResp.status, profileResp.data);

  // Admin: create exam
  const now = new Date();

  // Create multiple exams: one live exam matching student, one upcoming exam for other dept/year
  const examsToCreate = [
    {
      name: 'Integration Test Exam - CSE Year1 (live)',
      year: 1,
      department: 'cse',
      section: 'A',
      durationMinutes: 30,
      startTime: new Date(now.getTime() - 1 * 60 * 1000).toISOString(), // started 1 minute ago
      endTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      randomQuestionCount: 3,
    },
    {
      name: 'Integration Test Exam - AIML Year2 (upcoming)',
      year: 2,
      department: 'aiml',
      section: 'B',
      durationMinutes: 45,
      startTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // starts in 1 hour
      endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      randomQuestionCount: 5,
    },
  ];

  const createdExams = [];
  for (const body of examsToCreate) {
    const resp = await callApi('POST', `${API_BASE}/exams`, adminIdToken, body);
    console.log('Create exam ->', resp.status, resp.data && resp.data.id ? resp.data.id : resp.data);
    if (resp.status === 200 && resp.data && resp.data.id) createdExams.push(resp.data);
  }

  if (createdExams.length === 0) {
    console.error('Failed to create any exams; aborting further steps');
    return;
  }

  // Pick the first created exam (CSE Year1 live) for start/submit flow
  const exam = createdExams[0];

  // Student: list exams
  const listResp = await callApi('GET', `${API_BASE}/exams/student`, studentIdToken);
  console.log('GET /exams/student ->', listResp.status, listResp.data && listResp.data.length ? `${listResp.data.length} exams` : listResp.data);

  // Student: start exam
  const startResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, studentIdToken);
  console.log('POST /exams/:start ->', startResp.status, startResp.data && startResp.data.session ? 'session created' : startResp.data);

  // If there's a session, submit it
  const sessionId = startResp.data && startResp.data.session && startResp.data.session.id;
  if (sessionId) {
    const answers = {};
    if (startResp.data.session.questions) {
      startResp.data.session.questions.forEach((q, idx) => (answers[q.id || `q${idx}`] = 'A'));
    }
    const submitResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/submit`, studentIdToken, { answers });
    console.log('POST /exams/:submit ->', submitResp.status, submitResp.data);
  }

  // Admin: list sessions
  const sessionsResp = await callApi('GET', `${API_BASE}/exams/${exam.id}/sessions`, adminIdToken);
  console.log('GET /exams/:sessions ->', sessionsResp.status, sessionsResp.data && sessionsResp.data.length ? `${sessionsResp.data.length} sessions` : sessionsResp.data);

  // Cleanup (optional): delete exam doc and test users and user profiles
  // We'll delete the exam doc created
  try {
    await admin.firestore().collection('exams').doc(exam.id).delete();
    console.log('Deleted test exam doc', exam.id);
  } catch (e) {
    console.warn('Failed to delete exam doc', e.message);
  }

  // Delete sessions subcollection if exists (best-effort)
  try {
    const sessionsSnap = await admin.firestore().collection('exams').doc(exam.id).collection('sessions').listDocuments();
    for (const d of sessionsSnap) await d.delete();
  } catch (e) {
    // ignore
  }

  // Optionally delete users and user docs
  // Commented out for safety; uncomment if you want full cleanup
  // await admin.auth().deleteUser(adminUser.uid);
  // await admin.auth().deleteUser(studentUser.uid);
  // await usersRef.doc(adminUser.uid).delete();
  // await usersRef.doc(studentUser.uid).delete();

  console.log('Integration test completed');
}

main().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
