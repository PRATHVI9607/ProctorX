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
  const student2Email = 'test_student2@example.com';
  const student3Email = 'test_student3@example.com';
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
  const student2User = await createOrGetUser(student2Email, password);
  const student2Custom = await admin.auth().createCustomToken(student2User.uid);
  const student3User = await createOrGetUser(student3Email, password);
  const student3Custom = await admin.auth().createCustomToken(student3User.uid);
  const adminIdToken = await exchangeCustomTokenForIdToken(adminCustom, apiKey);
  const studentIdToken = await exchangeCustomTokenForIdToken(studentCustom, apiKey);
  const student2IdToken = await exchangeCustomTokenForIdToken(student2Custom, apiKey);
  const student3IdToken = await exchangeCustomTokenForIdToken(student3Custom, apiKey);
  console.log('Exchanged tokens for idTokens');

  // Student: POST /auth/profile
  const profileBody = { name: 'Test Student', year: 1, department: 'cse' };
  const profileResp = await callApi('POST', `${API_BASE}/auth/profile`, studentIdToken, profileBody);
  console.log('/auth/profile ->', profileResp.status, profileResp.data);

  // Create profiles for additional students
  await callApi('POST', `${API_BASE}/auth/profile`, student2IdToken, { name: 'Test Student Two', year: 1, department: 'cse' });
  await callApi('POST', `${API_BASE}/auth/profile`, student3IdToken, { name: 'Test Student Three', year: 2, department: 'aiml' });

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

  // Create 10 questions for the exam (admin)
  const createdQuestionIds = [];
  for (let i = 1; i <= 10; i++) {
    const q = {
      title: `Integration Q${i}`,
      text: `What is test question ${i}?`,
      choices: ['A', 'B', 'C', 'D'],
      answer: 'A',
      year: exam.year,
      department: exam.department,
      section: exam.section,
      createdBy: adminUser.uid,
    };
    const qResp = await callApi('POST', `${API_BASE}/questions`, adminIdToken, q);
    console.log('Create question ->', qResp.status, qResp.data && qResp.data.id ? qResp.data.id : qResp.data);
    if (qResp.status === 200 && qResp.data && qResp.data.id) createdQuestionIds.push(qResp.data.id);
  }

  // Student: list exams
  const listResp = await callApi('GET', `${API_BASE}/exams/student`, studentIdToken);
  console.log('GET /exams/student ->', listResp.status, listResp.data && listResp.data.length ? `${listResp.data.length} exams` : listResp.data);

  // Student1: start exam
  const startResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, studentIdToken);
  console.log('Student1 start ->', startResp.status, startResp.data && startResp.data.session ? 'session created' : startResp.data);

  // Student2: start exam
  const startResp2 = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, student2IdToken);
  console.log('Student2 start ->', startResp2.status, startResp2.data && startResp2.data.session ? 'session created' : startResp2.data);

  // If there's a session for student1, submit it later after tests
  const sessionId = startResp.data && startResp.data.session && startResp.data.session.id;
  const sessionId2 = startResp2.data && startResp2.data.session && startResp2.data.session.id;

  // Simulate violation: student1 exits fullscreen
  // Comprehensive violation scenarios to test client-side detections
  const violationScenarios = [
    'fullscreen_exit',
    'Tab change / minimized',
    'Tried shortcut combination',
    'F12',
    'Right click',
    'Copy',
    'Paste',
    'Attempted to leave page',
    'multiple_tab_change',
    'shortcut_multi_keys',
  ];

  for (const reason of violationScenarios) {
    console.log('--- Simulating violation:', reason);
    const resp = await callApi('POST', `${API_BASE}/exams/${exam.id}/violation`, studentIdToken, { reason });
    console.log('Violation reported ->', resp.status, resp.data && resp.data.awaitingApproval ? 'awaitingApproval' : resp.data);

    // Admin inspects sessions and approves for the first few, denies for later ones to test both flows
    const sessionsBefore = await callApi('GET', `${API_BASE}/exams/${exam.id}/sessions`, adminIdToken);
    console.log('Sessions snapshot ->', sessionsBefore.status, sessionsBefore.data && sessionsBefore.data.length ? `${sessionsBefore.data.length} sessions` : sessionsBefore.data);

    // Find the session for our student
    const targetSession = sessionsBefore.data && sessionsBefore.data.find((s) => s.userId === startResp.data.session.userId);
    if (targetSession && targetSession.awaitingApproval) {
      // Alternate approve/deny based on reason index — approve even indices, deny odd
      const index = violationScenarios.indexOf(reason);
      const approve = index % 2 === 0;
      const actionResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/sessions/${targetSession.id}/approve`, adminIdToken, { approve, note: `Auto-${approve ? 'approve' : 'deny'} for test: ${reason}` });
      console.log(`${approve ? 'Approved' : 'Denied'} ->`, actionResp.status, actionResp.data && actionResp.data.status ? actionResp.data.status : actionResp.data);
    }

    // Small wait to allow DB consistency (basic)
    await new Promise((r) => setTimeout(r, 400));
  }

  // After testing violations, submit the session for the approved case
  if (sessionId) {
    const answers = {};
    if (startResp.data.session.questions) {
      startResp.data.session.questions.forEach((q, idx) => (answers[q.id || `q${idx}`] = 'A'));
    }
    const submitResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/submit`, studentIdToken, { answers });
    console.log('Student1 submit ->', submitResp.status, submitResp.data && submitResp.data.status ? submitResp.data.status : submitResp.data);
  }

  // Admin: list sessions
  const sessionsResp = await callApi('GET', `${API_BASE}/exams/${exam.id}/sessions`, adminIdToken);
  console.log('GET /exams/:sessions ->', sessionsResp.status, sessionsResp.data && sessionsResp.data.length ? `${sessionsResp.data.length} sessions` : sessionsResp.data);

  // Cleanup (optional): delete exam doc and test users and user profiles
  // We'll delete the exam doc created
  // Cleanup: delete created exams
  for (const e of createdExams) {
    try {
      await admin.firestore().collection('exams').doc(e.id).delete();
      console.log('Deleted test exam doc', e.id);
    } catch (err) {
      console.warn('Failed to delete exam doc', e.id, err.message);
    }
  }

  // Delete sessions subcollection if exists (best-effort)
  try {
    for (const e of createdExams) {
      const sessionsSnap = await admin.firestore().collection('exams').doc(e.id).collection('sessions').listDocuments();
      for (const d of sessionsSnap) await d.delete();
    }
  } catch (e) {
    // ignore
  }

  // Delete created questions
  try {
    for (const qid of createdQuestionIds || []) {
      await admin.firestore().collection('questions').doc(qid).delete();
      console.log('Deleted question', qid);
    }
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
