const path = require('path');
const fs = require('fs');
const fetch = global.fetch || require('node-fetch');
const admin = require('../src/firebaseAdmin');

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

  const adminEmail = 'violation_admin@example.com';
  const student1 = 'viol_student1@example.com';
  const student2 = 'viol_student2@example.com';
  const password = 'Test1234!';

  const adminUser = await createOrGetUser(adminEmail, password);
  const s1 = await createOrGetUser(student1, password);
  const s2 = await createOrGetUser(student2, password);

  // set admin role
  await admin.firestore().collection('users').doc(adminUser.uid).set({ role: 'admin', email: adminEmail }, { merge: true });

  const adminCustom = await admin.auth().createCustomToken(adminUser.uid);
  const s1Custom = await admin.auth().createCustomToken(s1.uid);
  const s2Custom = await admin.auth().createCustomToken(s2.uid);

  const adminIdToken = await exchangeCustomTokenForIdToken(adminCustom, apiKey);
  const s1IdToken = await exchangeCustomTokenForIdToken(s1Custom, apiKey);
  const s2IdToken = await exchangeCustomTokenForIdToken(s2Custom, apiKey);

  // post profiles
  await callApi('POST', `${API_BASE}/auth/profile`, s1IdToken, { name: 'Violator One', year: 2, department: 'cse' });
  await callApi('POST', `${API_BASE}/auth/profile`, s2IdToken, { name: 'Violator Two', year: 2, department: 'cse' });

  // create exam and questions
  const now = new Date();
  const examBody = {
    name: 'Violation Approval Flow Exam',
    year: 2,
    department: 'cse',
    section: 'A',
    durationMinutes: 30,
    startTime: new Date(now.getTime() - 1000 * 60).toISOString(),
    endTime: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
    randomQuestionCount: 3,
  };
  const createExamResp = await callApi('POST', `${API_BASE}/exams`, adminIdToken, examBody);
  if (createExamResp.status !== 200 || !createExamResp.data || !createExamResp.data.id) {
    console.error('Failed to create exam', createExamResp);
    return;
  }
  const exam = createExamResp.data;
  console.log('Created exam', exam.id);

  // create small question pool
  const qIds = [];
  for (let i = 1; i <= 5; i++) {
    const q = { title: `VQ${i}`, text: `V question ${i}`, choices: ['A','B','C','D'], answer: 'A', year: 2, department: 'cse', section: 'a', createdBy: adminUser.uid };
    const r = await callApi('POST', `${API_BASE}/questions`, adminIdToken, q);
    if (r.status === 200 && r.data && r.data.id) qIds.push(r.data.id);
  }
  console.log('Created questions', qIds.join(', '));

  // both students start
  const start1 = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, s1IdToken);
  const start2 = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, s2IdToken);
  console.log('Student1 start ->', start1.status);
  console.log('Student2 start ->', start2.status);

  // both report violation
  const v1 = await callApi('POST', `${API_BASE}/exams/${exam.id}/violation`, s1IdToken, { reason: 'fullscreen_exit' });
  const v2 = await callApi('POST', `${API_BASE}/exams/${exam.id}/violation`, s2IdToken, { reason: 'tab_switch' });
  console.log('Student1 violation ->', v1.status, v1.data && v1.data.awaitingApproval);
  console.log('Student2 violation ->', v2.status, v2.data && v2.data.awaitingApproval);

  // admin snapshots sessions
  const sessionsBefore = await callApi('GET', `${API_BASE}/exams/${exam.id}/sessions`, adminIdToken);
  console.log('Admin sessions snapshot (after violations):', sessionsBefore.status, JSON.stringify(sessionsBefore.data, null, 2));

  // ensure both awaitingApproval
  const s1Session = sessionsBefore.data.find(s => s.userId === start1.data.session.userId);
  const s2Session = sessionsBefore.data.find(s => s.userId === start2.data.session.userId);
  if (!s1Session || !s2Session) {
    console.error('Could not find sessions for students in admin snapshot');
    return;
  }
  console.log('s1 awaitingApproval:', s1Session.awaitingApproval, 's2 awaitingApproval:', s2Session.awaitingApproval);

  // Admin approves student1, denies student2
  const approveResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/sessions/${s1Session.id}/approve`, adminIdToken, { approve: true, note: 'OK to continue' });
  const denyResp = await callApi('POST', `${API_BASE}/exams/${exam.id}/sessions/${s2Session.id}/approve`, adminIdToken, { approve: false, note: 'Do not continue' });
  console.log('Approve resp:', approveResp.status, approveResp.data && approveResp.data.status);
  console.log('Deny resp:', denyResp.status, denyResp.data && denyResp.data.status);

  // admin checks sessions again
  const sessionsAfter = await callApi('GET', `${API_BASE}/exams/${exam.id}/sessions`, adminIdToken);
  console.log('Admin sessions snapshot (after decisions):', sessionsAfter.status, JSON.stringify(sessionsAfter.data, null, 2));

  const s1After = sessionsAfter.data.find(s => s.userId === start1.data.session.userId);
  const s2After = sessionsAfter.data.find(s => s.userId === start2.data.session.userId);

  console.log('s1 status:', s1After.status, 'awaitingApproval:', s1After.awaitingApproval);
  console.log('s2 status:', s2After.status, 'awaitingApproval:', s2After.awaitingApproval);

  // Student2 attempt to submit or continue - fetch session via start (createOrGetSession returns existing doc)
  const s2Restart = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, s2IdToken);
  console.log('Student2 start after denial -> status:', s2Restart.status);
  if (s2Restart.status === 200 && s2Restart.data && s2Restart.data.session) {
    console.log('Student2 session status after denial:', s2Restart.data.session.status);
  }

  // cleanup: delete exam and questions
  try { await admin.firestore().collection('exams').doc(exam.id).delete(); } catch (e) {}
  try {
    const sessionsSnap = await admin.firestore().collection('exams').doc(exam.id).collection('sessions').listDocuments();
    for (const d of sessionsSnap) await d.delete();
  } catch (e) {}
  for (const q of qIds) { try { await admin.firestore().collection('questions').doc(q).delete(); } catch (e) {} }

  console.log('Test complete');
}

main().catch(err => { console.error('Test failed', err); process.exit(1); });
