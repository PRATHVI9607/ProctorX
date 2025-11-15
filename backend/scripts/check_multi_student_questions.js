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

  const adminEmail = 'check_admin@example.com';
  const studentA = 'check_student_a@example.com';
  const studentB = 'check_student_b@example.com';
  const password = 'Test1234!';

  const adminUser = await createOrGetUser(adminEmail, password);
  const sA = await createOrGetUser(studentA, password);
  const sB = await createOrGetUser(studentB, password);

  // ensure admin role in firestore
  await admin.firestore().collection('users').doc(adminUser.uid).set({ role: 'admin', email: adminEmail }, { merge: true });

  const adminCustom = await admin.auth().createCustomToken(adminUser.uid);
  const sACustom = await admin.auth().createCustomToken(sA.uid);
  const sBCustom = await admin.auth().createCustomToken(sB.uid);

  const adminIdToken = await exchangeCustomTokenForIdToken(adminCustom, apiKey);
  const sAIdToken = await exchangeCustomTokenForIdToken(sACustom, apiKey);
  const sBIdToken = await exchangeCustomTokenForIdToken(sBCustom, apiKey);

  // POST profiles for students (year 2 CSE)
  await callApi('POST', `${API_BASE}/auth/profile`, sAIdToken, { name: 'Student A', year: 2, department: 'cse' });
  await callApi('POST', `${API_BASE}/auth/profile`, sBIdToken, { name: 'Student B', year: 2, department: 'cse' });

  // create exam (year 2, cse) live now
  const now = new Date();
  const examBody = {
    name: 'Check Multi Student Exam - CSE Year2',
    year: 2,
    department: 'cse',
    section: 'A',
    durationMinutes: 30,
    startTime: new Date(now.getTime() - 1000 * 60).toISOString(),
    endTime: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
    randomQuestionCount: 5,
  };

  const createExamResp = await callApi('POST', `${API_BASE}/exams`, adminIdToken, examBody);
  if (createExamResp.status !== 200 || !createExamResp.data || !createExamResp.data.id) {
    console.error('Failed to create exam', createExamResp.status, createExamResp.data);
    return;
  }
  const exam = createExamResp.data;
  console.log('Created exam', exam.id);

  // create questions: 6 cse + 6 general
  const createdQ = [];
  for (let i = 1; i <= 6; i++) {
    const q = { title: `CSE Q${i}`, text: `CSE question ${i}`, choices: ['A','B','C','D'], answer: 'A', year: 2, department: 'cse', section: 'a', createdBy: adminUser.uid };
    const r = await callApi('POST', `${API_BASE}/questions`, adminIdToken, q);
    if (r.status === 200 && r.data && r.data.id) createdQ.push({ id: r.data.id, ...q });
  }
  for (let i = 1; i <= 6; i++) {
    const q = { title: `GEN Q${i}`, text: `General question ${i}`, choices: ['A','B','C','D'], answer: 'A', year: 2, department: 'general', section: 'a', createdBy: adminUser.uid };
    const r = await callApi('POST', `${API_BASE}/questions`, adminIdToken, q);
    if (r.status === 200 && r.data && r.data.id) createdQ.push({ id: r.data.id, ...q });
  }

  console.log('Created questions:', createdQ.map(q=>q.id).join(', '));

  // Start exam for both students
  const s1 = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, sAIdToken);
  const s2 = await callApi('POST', `${API_BASE}/exams/${exam.id}/start`, sBIdToken);

  if (s1.status !== 200 || !s1.data || !s1.data.session) {
    console.error('Student A failed to start', s1);
  }
  if (s2.status !== 200 || !s2.data || !s2.data.session) {
    console.error('Student B failed to start', s2);
  }

  const sessA = s1.data.session;
  const sessB = s2.data.session;

  console.log('\nSession for Student A:');
  if (sessA && sessA.questions) {
    sessA.questions.forEach((q, idx) => console.log(`${idx+1}. ${q.id || q.title || q}`));
  }

  console.log('\nSession for Student B:');
  if (sessB && sessB.questions) {
    sessB.questions.forEach((q, idx) => console.log(`${idx+1}. ${q.id || q.title || q}`));
  }

  // Compare
  const aIds = (sessA && sessA.questions) ? sessA.questions.map(q => q.id || q) : [];
  const bIds = (sessB && sessB.questions) ? sessB.questions.map(q => q.id || q) : [];

  const equalSet = aIds.length === bIds.length && aIds.every((v,i)=>v===bIds[i]);
  const sameElements = aIds.length === bIds.length && aIds.every(v=>bIds.includes(v));

  console.log('\nComparison:');
  console.log('Exact same order and items?', !!equalSet);
  console.log('Same items but potentially different order?', !!sameElements);

  // cleanup
  try {
    await admin.firestore().collection('exams').doc(exam.id).delete();
    console.log('Deleted exam', exam.id);
  } catch (e) {}
  try {
    const sessionsSnap = await admin.firestore().collection('exams').doc(exam.id).collection('sessions').listDocuments();
    for (const d of sessionsSnap) await d.delete();
  } catch (e) {}
  for (const q of createdQ) {
    try { await admin.firestore().collection('questions').doc(q.id).delete(); } catch (e) {}
  }

  console.log('Done');
}

main().catch(err=>{ console.error('Failed', err); process.exit(1); });
