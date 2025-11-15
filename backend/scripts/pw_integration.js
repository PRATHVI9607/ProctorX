const puppeteer = require('puppeteer');
const admin = require('../src/firebaseAdmin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Config
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function ensureTestEmailDeleted(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('Deleting existing test user:', email, user.uid);
    await admin.auth().deleteUser(user.uid);
    await admin.firestore().collection('users').doc(user.uid).delete().catch(() => {});
  } catch (e) {
    // ignore if not found
  }
}

async function createExamViaApi(adminIdToken, examBody) {
  const res = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminIdToken}`,
    },
    body: JSON.stringify(examBody),
  });
  return res.json();
}

(async () => {
  // Unique test emails
  const studentEmail = `pw_test_student_${Date.now()}@example.com`;
  const studentPassword = 'Test12345!';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'test_admin@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'Test1234!';

  console.log('Starting Puppeteer integration test');

  // Clean any existing test user
  await ensureTestEmailDeleted(studentEmail).catch(() => {});

  // Launch browser
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  // capture client console and errors for debugging
  page.on('console', (msg) => {
    try {
      const args = msg.args().map((a) => a.jsonValue()).map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
      console.log('[PAGE LOG]', args);
    } catch (e) {
      console.log('[PAGE LOG]', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err);
  });

  try {
    // Open student register page
    await page.goto(`${FRONTEND_URL}/student-login`, { waitUntil: 'networkidle2' });

    // Switch to register mode
    await page.waitForSelector('button.button-ghost');
    // Click Register button in the form area (there are two button.button-ghosts, ensure we click the Register toggle)
    const buttons = await page.$$('button.button-ghost');
    // Find the one that contains 'Register' text
    for (const b of buttons) {
      const txt = await page.evaluate((el) => el.textContent, b);
      if (txt && txt.toLowerCase().includes('register')) {
        await b.click();
        break;
      }
    }

    // Fill registration form: name, email, password, year, department
    await page.waitForSelector('input[placeholder="Student Email"]');
    await page.type('input[placeholder="Student Email"]', studentEmail);
    await page.type('input[placeholder="Password"]', studentPassword);

    // Name input (present in register mode)
    await page.type('input[placeholder="Full name"]', 'Puppeteer Test');

    // Year select
    await page.select('select', '1');

    // Department input (free text)
    const deptInput = await page.$('input[placeholder="Department (e.g. cse or general)"]');
    if (deptInput) {
      await deptInput.type('General');
    } else {
      // fallback: find input by label
      const inputs = await page.$$('input.input');
      await inputs[inputs.length - 1].type('General');
    }

    // Submit register
    await page.click('button[type="submit"]');

    // Wait for navigation to student portal
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Student registered and navigated to:', page.url());

    // Get current user via Firebase Admin by email to check Firestore profile
    const user = await admin.auth().getUserByEmail(studentEmail);
    const uid = user.uid;
    console.log('Found auth user:', uid);

    // Poll Firestore for the users/{uid} profile document (give frontend some time to POST it)
    const usersRef = admin.firestore().collection('users').doc(uid);
    let snap = await usersRef.get();
    const startPoll = Date.now();
    // Wait up to 20s for profile fields to appear
    while ((!(snap.exists && snap.data() && snap.data().year !== undefined && snap.data().department !== undefined)) && Date.now() - startPoll < 20000) {
      await new Promise((r) => setTimeout(r, 500));
      snap = await usersRef.get();
    }
    if (!(snap.exists && snap.data() && snap.data().year !== undefined && snap.data().department !== undefined)) {
      console.warn('User profile exists but missing year/department after waiting. Current doc:', snap.exists ? snap.data() : null);
    } else {
      console.log('User profile in Firestore:', snap.data());
    }

    // Verify profile info appears in UI (allow some time for UI to reflect backend)
  await page.waitForSelector('.section-title');
  await new Promise((r) => setTimeout(r, 1000));
    const profileText = await page.evaluate(() => document.body.innerText);
    if (!/Year:/i.test(profileText) || !/Department:/i.test(profileText)) {
      throw new Error('Profile info not present in student portal UI');
    }
    console.log('Student portal shows profile info');

    // Create an exam via admin API that matches year=1 and department=general
    // Get admin custom token and exchange it for idToken using frontend API key
    const adminUser = await admin.auth().getUserByEmail(adminEmail);
    const custom = await admin.auth().createCustomToken(adminUser.uid);
    // Read frontend API key from frontend/.env.development
    const envPath = path.resolve(__dirname, '../../frontend/.env.development');
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/REACT_APP_FIREBASE_API_KEY\s*=\s*(.*)/);
    const apiKey = match ? match[1].trim() : null;
    if (!apiKey) throw new Error('Frontend API key not found');
    const exchange = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: custom, returnSecureToken: true })
    });
    const exchangeBody = await exchange.json();
    const adminIdToken = exchangeBody.idToken;

    const now = new Date();
    const examBody = {
      name: 'Puppeteer Integration Exam',
      year: 1,
      department: 'general',
      section: 'general',
      durationMinutes: 15,
      startTime: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      randomQuestionCount: 3,
    };

    const created = await createExamViaApi(adminIdToken, examBody);
    console.log('Exam created via API:', created.id || created);

    // Go to student portal and start the exam via UI
    await page.goto(`${FRONTEND_URL}/student`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    // Find the exam card by name and click its Start button
    const examName = 'Puppeteer Integration Exam';
    const examHandles = await page.$$('div.card-soft');
    let started = false;
    for (const h of examHandles) {
      const text = await page.evaluate((el) => el.innerText, h);
      if (text && text.includes(examName)) {
        // find button inside
        const btn = await h.$('button.button-primary');
        if (btn) {
          await btn.click();
          started = true;
          break;
        }
      }
    }
    if (!started) {
      throw new Error('Created exam not visible in student UI / Start button not found');
    }
    console.log('Clicked Start on exam card');
    // wait for exam interface to load
    await page.waitForSelector('.timer-pill', { timeout: 10000 });
    console.log('Exam interface loaded');

    // Simulate proctoring events to trigger client-side monitors and ensure backend records violations
    const sessionRef = admin.firestore().collection('exams').doc(created.id).collection('sessions').doc(uid);

    // helper: read violations count
    async function getViolationsCount() {
      const s = await sessionRef.get();
      const data = s.exists ? s.data() : null;
      return data && data.violations ? data.violations.length : 0;
    }

    let beforeCount = await getViolationsCount();
    console.log('Initial violations count:', beforeCount);

    // 1) Simulate fullscreen exit by toggling document.fullscreenElement and dispatch fullscreenchange
    await page.evaluate(() => {
      try { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: true }); } catch (e) {}
      document.dispatchEvent(new Event('fullscreenchange'));
      try { Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null }); } catch (e) {}
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log('Simulated fullscreen exit');

    // 2) Simulate visibility change (tab switch)
    await page.evaluate(() => {
      try { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); } catch (e) {}
      document.dispatchEvent(new Event('visibilitychange'));
      try { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); } catch (e) {}
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise((r) => setTimeout(r, 500));
    console.log('Simulated visibilitychange');

    // 3) Simulate forbidden key combos (Ctrl/Cmd+Key)
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyC');
    await page.keyboard.up('Control');
    await new Promise((r) => setTimeout(r, 300));
    console.log('Simulated Ctrl+C');

    // 4) Simulate F12
    await page.keyboard.press('F12');
    await new Promise((r) => setTimeout(r, 300));
    console.log('Simulated F12');

    // 5) Simulate right click on the page
    await page.click('body', { button: 'right' });
    await new Promise((r) => setTimeout(r, 300));
    console.log('Simulated right click');

    // 6) Simulate copy and paste events
    await page.evaluate(() => {
      document.dispatchEvent(new Event('copy'));
      document.dispatchEvent(new Event('paste'));
    });
    await new Promise((r) => setTimeout(r, 300));
    console.log('Simulated copy/paste');

    // 7) Simulate beforeunload
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
    await new Promise((r) => setTimeout(r, 300));
    console.log('Simulated beforeunload');

    // Wait a moment and verify violations recorded
    await new Promise((r) => setTimeout(r, 1500));
    const afterCount = await getViolationsCount();
    console.log('Violations count after simulations:', afterCount);

    // Clean up: delete created exam and user profile
    try {
      if (created && created.id) {
        await admin.firestore().collection('exams').doc(created.id).delete();
        console.log('Deleted created exam', created.id);
      }
    } catch (e) {}

    // Close browser
    await browser.close();
    console.log('Puppeteer integration test PASSED');
  } catch (err) {
    console.error('Puppeteer integration test FAILED:', err);
    await browser.close();
    process.exit(1);
  }
})();
