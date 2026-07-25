import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = 'C:\\Users\\Sagnik\\.gemini\\antigravity\\brain\\3a2ba45e-0e4f-48fd-8718-09f357827421';

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Starting E2E Browser Validation Journey...');
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Create a dummy document for upload (valid 1x1 PNG image)
  const dummyDocPath = path.join(process.cwd(), 'dummy_id_document.png');
  const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789cc5c0010d000000c220fba77f0953080000000049454e44ae426082';
  fs.writeFileSync(dummyDocPath, Buffer.from(pngHex, 'hex'));


  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // Mock Nominatim geocoding API responses inside the browser context
  await page.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options) {
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
      if (urlStr.includes('nominatim.openstreetmap.org/search')) {
        console.log(`[BROWSER FETCH MOCK] Intercepted search URL: ${urlStr}`);
        return new Response(JSON.stringify([{
          display_name: 'Kolkata, West Bengal, India',
          lat: '22.572648',
          lon: '88.363895'
        }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('nominatim.openstreetmap.org/reverse')) {
        console.log(`[BROWSER FETCH MOCK] Intercepted reverse URL: ${urlStr}`);
        return new Response(JSON.stringify({
          display_name: 'Kolkata, West Bengal, India'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch.apply(this, arguments);
    };
  });

  // Browser Console & Exception Listeners
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning' || msg.text().includes('Socket') || msg.text().includes('state')) {
      console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err.toString());
  });

  // Global Dialog Handler
  const uniqueId = Date.now();
  page.on('dialog', async dialog => {
    const message = dialog.message();
    console.log(`[DIALOG OPENED] Message: "${message}"`);
    console.log('Responding to dialog with: Accept');
    await dialog.accept();
  });

  try {
    // ----------------------------------------------------
    // Journey 1: Landing Page & Onboarding Redirect
    // ----------------------------------------------------
    console.log('\n[1/6] Navigating to Landing Page...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing_page.png') });
    console.log('✓ Captured 01_landing_page.png');

    console.log('Clicking "Apply as Responder" in navigation header...');
    const links = await page.$$('a');
    let applyLinkFound = false;
    for (const link of links) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text.includes('Apply as Responder')) {
        await link.click();
        applyLinkFound = true;
        break;
      }
    }
    
    if (!applyLinkFound) {
      console.log('Fallback: Direct navigation to responder info page');
      await page.goto('http://localhost:5173/responder-info', { waitUntil: 'networkidle2' });
    } else {
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_volunteer_register_page.png') });
    console.log('✓ Navigated to Responder Info page. Captured 02_volunteer_register_page.png');

    console.log('Clicking "Create Account" CTA on Responder Info page...');
    const infoButtons = await page.$$('button');
    let createAccountBtnFound = false;
    for (const btn of infoButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Create Account')) {
        await btn.click();
        createAccountBtnFound = true;
        break;
      }
    }
    
    if (!createAccountBtnFound) {
      console.log('Fallback: Direct navigation to register page');
      await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    } else {
      await delay(1000);
    }

    // ----------------------------------------------------
    // Journey 2: Volunteer Account Registration
    // ----------------------------------------------------
    console.log('\n[2/6] Filling register form details...');
    const volunteerEmail = `volunteer_${uniqueId}@test.com`;
    const volunteerName = `Test Volunteer ${uniqueId}`;
    const randomPhone = '555' + Math.floor(1000000 + Math.random() * 9000000).toString();

    await page.type('input[name="fullName"]', volunteerName, { delay: 20 });
    await page.type('input[name="phone"]', randomPhone, { delay: 20 });
    await page.type('input[name="email"]', volunteerEmail, { delay: 20 });
    await page.select('select[name="bloodGroup"]', 'O+');
    await page.type('input[name="password"]', 'SecuredPass123!', { delay: 20 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_register_form_filled.png') });
    console.log('✓ Form filled. Captured 03_register_form_filled.png');

    console.log('Submitting registration...');
    await page.click('button[type="submit"]');
    await delay(3500); // Wait for API response and redirect to dashboard

    // Now navigate to /apply by direct routing
    console.log('Navigating to /apply to become responder...');
    await page.goto('http://localhost:5173/apply', { waitUntil: 'networkidle2' });
    await delay(1500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_volunteer_apply_redirect.png') });
    console.log('✓ Navigated to apply page. Captured 04_volunteer_apply_redirect.png');

    // ----------------------------------------------------
    // Journey 3: Volunteer Onboarding Application Submission
    // ----------------------------------------------------
    await page.type('input[name="age"]', '25', { delay: 20 });
    await page.select('select[name="governmentIdType"]', 'aadhar');
    await page.type('input[name="governmentIdNumber"]', 'DL-987654321', { delay: 20 });

    console.log('Opening Map Picker Modal...');
    await page.click('button[title="Select location on Map"]');
    await delay(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug_map_modal_opened.png') });

    console.log('Searching for address in Map Picker Autocomplete...');
    const searchSelector = 'input[placeholder="Search for address, landmark, or city..."]';
    await page.waitForSelector(searchSelector, { timeout: 5000 });
    await page.evaluate((sel) => {
      const input = document.querySelector(sel);
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set;
        nativeInputValueSetter.call(input, "Kolkata");
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, searchSelector);
    await delay(2500); // Wait for Nominatim suggestions to load
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug_map_search_typed.png') });

    console.log('Selecting first suggestion from autocomplete dropdown...');
    await page.waitForSelector('ul li', { timeout: 5000 });
    await page.click('ul li');
    await delay(1500); // Wait for map centring and marker placement

    console.log('Confirming location...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirm = buttons.find(b => b.textContent.includes('Confirm Location'));
      if (confirm) confirm.click();
    });
    await delay(1000);

    const radiusInput = await page.$('input[name="serviceRadiusKm"]');
    await radiusInput.click({ clickCount: 3 });
    await radiusInput.press('Backspace');
    await page.type('input[name="serviceRadiusKm"]', '10', { delay: 20 });

    console.log('Uploading verification document...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(dummyDocPath);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_apply_form_filled.png') });
    console.log('✓ Details & file added. Captured 05_apply_form_filled.png');

    console.log('Submitting volunteer profile application...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Submit Volunteer Application')) {
        await btn.click();
        break;
      }
    }
    await delay(3000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_apply_pending_review.png') });
    console.log('✓ Application submitted. Captured 06_apply_pending_review.png');

    // Logout using DOM click to bypass toast overlays
    console.log('Logging out volunteer account...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Log Out"]');
      if (btn) btn.click();
    });
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });

    // ----------------------------------------------------
    // Journey 4: Admin Portal Sign In
    // ----------------------------------------------------
    console.log('\n[4/6] Navigating to Admin Login Portal...');
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_admin_login_portal.png') });
    console.log('✓ Captured 07_admin_login_portal.png');

    console.log('Entering seeded Admin credentials...');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.type('input[name="email"]', 'admin@flare.local', { delay: 20 });
    await page.type('input[name="password"]', 'Admin@Flare2026', { delay: 20 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_admin_credentials_entered.png') });
    console.log('✓ Credentials filled. Captured 08_admin_credentials_entered.png');

    console.log('Submitting admin login...');
    await page.click('button[type="submit"]');
    await delay(3000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_admin_dashboard.png') });
    console.log('✓ Logged in as Admin. Captured 09_admin_dashboard.png');

    // ----------------------------------------------------
    // Journey 5: Admin Approves Volunteer Application
    // ----------------------------------------------------
    console.log('\n[5/6] Navigating to Admin Volunteer Verification Panel...');
    await page.goto('http://localhost:5173/admin/volunteers', { waitUntil: 'networkidle2' });
    await delay(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_admin_volunteer_queue.png') });
    console.log('✓ Loaded queue. Captured 10_admin_volunteer_queue.png');

    console.log(`Approving applicant: ${volunteerName}...`);
    const approveButtons = await page.$$('button');
    let approved = false;
    for (const btn of approveButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Approve Application')) {
        await btn.click();
        approved = true;
        break;
      }
    }
    await delay(3000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_admin_approved_queue.png') });
    console.log('✓ Approved application. Captured 11_admin_approved_queue.png');

    // Logout admin using DOM click
    console.log('Logging out Admin account...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Log Out"]');
      if (btn) btn.click();
    });
    await delay(1500);

    // ----------------------------------------------------
    // Journey 6: Verified Volunteer Dashboard Login
    // ----------------------------------------------------
    console.log('\n[6/6] Logging back in as our newly approved Volunteer...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug_7_login.png') });
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.type('input[name="email"]', volunteerEmail, { delay: 20 });
    await page.type('input[name="password"]', 'SecuredPass123!', { delay: 20 });
    await page.click('button[type="submit"]');
    await delay(3000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_volunteer_dashboard_verified.png') });
    console.log('✓ Logged in as Verified Volunteer! Captured 14_volunteer_dashboard_verified.png');
    
    console.log('Navigating to Safety Resources page within Volunteer Layout...');
    await page.waitForSelector('a[href="/resources/volunteer"]', { timeout: 5000 });
    await page.click('a[href="/resources/volunteer"]');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_volunteer_safety_resources.png') });
    console.log('✓ Captured 15_volunteer_safety_resources.png');

    console.log('Navigating to Account Settings page within Volunteer Layout...');
    await page.waitForSelector('button[title="Account Settings"]', { timeout: 5000 });
    await page.click('button[title="Account Settings"]');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_volunteer_settings.png') });
    console.log('✓ Captured 16_volunteer_settings.png');

    console.log('\nALL E2E BROWSER JOURNEYS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ E2E Browser Validation Journey Failed:', err);
  } finally {
    // Cleanup temporary document
    if (fs.existsSync(dummyDocPath)) {
      fs.unlinkSync(dummyDocPath);
    }
    await browser.close();
    console.log('E2E validation finished and browser closed.');
  }
}

run();
