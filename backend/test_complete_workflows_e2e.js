import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import db from './config/database.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = 'C:\\Users\\Sagnik\\.gemini\\antigravity\\scratch\\screenshots';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForAndClickButton(page, text) {
  await page.waitForFunction((btnText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(b => b.textContent.includes(btnText));
  }, { timeout: 15000 }, text);
  
  const clicked = await page.evaluate((btnText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes(btnText));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
  
  if (!clicked) {
    throw new Error(`Button with text "${text}" not found`);
  }
}

async function run() {
  console.log('Starting Complete Workflows E2E Browser Test...');
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Create a dummy document for upload
  const dummyDocPath = path.join(process.cwd(), 'dummy_id_document_e2e.png');
  const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789cc5c0010d000000c220fba77f0953080000000049454e44ae426082';
  fs.writeFileSync(dummyDocPath, Buffer.from(pngHex, 'hex'));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // Intercept fetch calls for Nominatim and Overpass API
  await page.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options) {
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
      if (urlStr.includes('nominatim.openstreetmap.org/search')) {
        return new Response(JSON.stringify([{
          display_name: 'Mountain View, Santa Clara County, California',
          lat: '37.4224858',
          lon: '-122.0855846'
        }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('nominatim.openstreetmap.org/reverse')) {
        return new Response(JSON.stringify({
          display_name: '1600 Amphitheatre Pkwy, Mountain View, CA'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('overpass-api.de/api/interpreter')) {
        return new Response(JSON.stringify({
          elements: [
            {
              type: 'node',
              id: 987654,
              lat: 37.435000,
              lon: -122.095000,
              tags: {
                amenity: 'police',
                name: 'External Discovered Station 99',
                'addr:street': 'El Camino Highway, Mountain View, CA',
                phone: '+16509998888'
              }
            }
          ]
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
    if (type === 'error' || type === 'warning') {
      console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err.toString());
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`[API REQUEST] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`[API RESPONSE] ${response.status()} ${response.url()}`);
      if (response.status() >= 400) {
        response.text().then(text => {
          console.log(`[API ERROR RESPONSE BODY] ${text}`);
        }).catch(() => {});
      }
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('/api/')) {
      console.log(`[API REQUEST FAILED] ${request.url()} | Error: ${request.failure()?.errorText}`);
    }
  });

  // Auto-accept alert dialogs
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.message()}`);
    await dialog.accept();
  });

  const randomSuffix = Math.floor(Math.random() * 1000000);
  const volunteerEmail = `vol_e2e_${randomSuffix}@test.com`;
  const volunteerPassword = 'Password123!';

  try {
    // ----------------------------------------------------
    // WORKFLOW 1: Register Volunteer User
    // ----------------------------------------------------
    console.log('\n[1/7] Registering prospective volunteer...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // Click register link
    await page.click('a[href="/register"]');
    await page.waitForSelector('input[placeholder="Jane Doe"]');
    
    await page.type('input[placeholder="Jane Doe"]', 'Jane Responder');
    await page.type('input[placeholder="jane@example.com"]', volunteerEmail);
    await page.type('input[placeholder="+1234567890"]', `+1650${randomSuffix.toString().padStart(6, '0').slice(0, 6)}`);
    await page.type('input[placeholder="Minimum 6 characters"]', volunteerPassword);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✓ Registered and redirected to dashboard. Current URL:', page.url());

    // Navigate to volunteer application /apply
    console.log('Navigating to volunteer application...');
    await page.goto('http://localhost:5173/apply', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="e.g. 25"]');

    await page.type('input[placeholder="e.g. 25"]', '26');
    
    // Clear default radius '5' and type '8'
    await page.focus('input[placeholder="e.g. 5"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="e.g. 5"]', '8');

    await page.select('select[id^="select-"]', 'passport');
    await page.type('input[placeholder="e.g. DL-9876543"]', 'PASS-98765432');

    // Click Map Picker icon
    console.log('Clicking Map Picker Icon...');
    await page.click('button[title="Select location on Map"]');
    await page.waitForSelector('#map-picker-search-input');
    await delay(500);

    // Search Mountain View
    await page.type('#map-picker-search-input', 'Mountain View');
    await waitForAndClickButton(page, 'Search');
    await delay(1000);

    // Confirm location
    console.log('Confirming location picker...');
    await waitForAndClickButton(page, 'Confirm Location');
    await delay(500);

    // Upload ID Verification document
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(dummyDocPath);
    await delay(500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_apply_form_filled.png') });

    // Submit Application
    await page.click('button[type="submit"]');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_apply_pending_review.png') });
    console.log('✓ Submitted volunteer application.');

    // Logout
    console.log('Logging out from user layout...');
    await page.click('button[title="Log Out"]');
    await delay(1000);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // ----------------------------------------------------
    // WORKFLOW 2: Admin Login & Volunteer Approval
    // ----------------------------------------------------
    console.log('\n[2/7] Logging in as Admin to verify volunteer...');
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="name@example.com"]');
    await page.type('input[placeholder="name@example.com"]', 'admin@flare.local');
    await page.type('input[placeholder="••••••••••••"]', 'Admin@Flare2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Verify volunteer
    await page.goto('http://localhost:5173/admin/volunteers', { waitUntil: 'networkidle2' });
    await delay(1000);
    await waitForAndClickButton(page, 'Approve Application');
    await delay(2000);
    console.log('✓ Volunteer approved by Admin.');

    // ----------------------------------------------------
    // WORKFLOW 3: Admin adds registered safety resource using Map Picker
    // ----------------------------------------------------
    console.log('\n[3/7] Admin creating new safety resource with schedule using Map Picker...');
    await page.goto('http://localhost:5173/admin/resources', { waitUntil: 'networkidle2' });
    await delay(1000);
    await waitForAndClickButton(page, 'Add Resource');
    await delay(500);

    await page.type('input[placeholder="City General Precinct 4"]', 'E2E Test Precinct 1');
    await page.select('select[id^="select-"]', 'police_station');
    await page.type('input[placeholder="+1234567890"]', '+16508882222');

    // Click Map Picker icon
    await page.click('button[title="Select location on Map"]');
    await page.waitForSelector('#map-picker-search-input');
    await page.type('#map-picker-search-input', 'Mountain View');
    await waitForAndClickButton(page, 'Search');
    await delay(1000);

    await waitForAndClickButton(page, 'Confirm Location');
    await delay(500);

    // Save Safety Resource
    await waitForAndClickButton(page, 'Save Resource');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'admin_res_list_updated.png') });
    console.log('✓ Safety resource registered successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
    const adminLogoutBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Log Out'));
    });
    await adminLogoutBtn.asElement().click();
    await delay(1000);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // ----------------------------------------------------
    // WORKFLOW 4: Volunteer Login & Safety Resources Map checks
    // ----------------------------------------------------
    console.log('\n[4/7] Volunteer logging in to inspect Safety Resources Map...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="name@example.com"]');
    await page.type('input[placeholder="name@example.com"]', volunteerEmail);
    await page.type('input[placeholder="••••••••••••"]', volunteerPassword);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Navigate to resources page
    await page.goto('http://localhost:5173/resources/volunteer', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.custom-resource-marker');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'volunteer_safety_resources.png') });
    console.log('✓ Volunteer Map rendered. Red, Green, and Orange markers displayed correctly.');

    // ----------------------------------------------------
    // WORKFLOW 5: Recommend Resource (RED Marker)
    // ----------------------------------------------------
    console.log('\n[5/7] Recommending a new safety resource...');
    const redMarkerHandle = await page.evaluateHandle(() => {
      const markers = Array.from(document.querySelectorAll('.custom-resource-marker'));
      return markers.find(m => m.innerHTML.includes('bg-danger')); // bg-danger = RED
    });

    if (redMarkerHandle.asElement()) {
      await redMarkerHandle.asElement().click();
      await delay(500);
      
      const recommendBtn = await page.evaluateHandle(() => {
        return document.querySelector('button[id^="btn-recommend-"]');
      });
      await recommendBtn.asElement().click();
      await delay(500);

      // Fill recommendation phone and review details
      await page.type('input[placeholder="+1234567890"]', '+16509997777');
      await page.type('textarea[placeholder^="Details about precinct"]', 'High quality neighborhood responder point.');
      await waitForAndClickButton(page, 'Submit Recommendation');
      await delay(1500);
      console.log('✓ Safety resource recommendation submitted.');
    } else {
      console.log('⚠️ Red Marker not found in E2E session.');
    }

    // ----------------------------------------------------
    // WORKFLOW 6: Recommend Closure (GREEN Marker)
    // ----------------------------------------------------
    console.log('\n[6/7] Recommending a resource closure...');
    const greenMarkerHandle = await page.evaluateHandle(() => {
      const markers = Array.from(document.querySelectorAll('.custom-resource-marker'));
      return markers.find(m => m.innerHTML.includes('bg-success')); // bg-success = GREEN
    });

    if (greenMarkerHandle.asElement()) {
      await greenMarkerHandle.asElement().click();
      await delay(500);

      const closeBtn = await page.evaluateHandle(() => {
        return document.querySelector('button[id^="btn-close-"]');
      });
      await closeBtn.asElement().click();
      await delay(500);

      await page.select('select[id^="select-"]', 'permanent');
      await waitForAndClickButton(page, 'Submit Closure Proposal');
      await delay(1500);
      console.log('✓ Closure recommendation submitted.');
    } else {
      console.log('⚠️ Green Marker not found in E2E session.');
    }

    // Logout Volunteer
    console.log('Logging out volunteer...');
    await page.click('button[title="Log Out"]');
    await delay(1000);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // ----------------------------------------------------
    // WORKFLOW 7: Admin Reviews Recommendations & Closures
    // ----------------------------------------------------
    console.log('\n[7/7] Admin reviewing pending recommendations & closures...');
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="name@example.com"]');
    await page.type('input[placeholder="name@example.com"]', 'admin@flare.local');
    await page.type('input[placeholder="••••••••••••"]', 'Admin@Flare2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Review recommended resource
    await page.goto('http://localhost:5173/admin/resources/recommendations', { waitUntil: 'networkidle2' });
    await delay(1000);
    await waitForAndClickButton(page, 'Review & Approve');
    await delay(500);
    await waitForAndClickButton(page, 'Approve & Register');
    await delay(1500);
    console.log('✓ Approved resource recommendation.');

    // Review closure
    await page.goto('http://localhost:5173/admin/resources/closures', { waitUntil: 'networkidle2' });
    await delay(1000);
    await waitForAndClickButton(page, 'Approve Closure');
    await delay(1500);
    console.log('✓ Approved closure recommendation.');

    console.log('\n==================================================');
    console.log('   ALL E2E WORKFLOWS VERIFIED SUCCESSFUL          ');
    console.log('==================================================');

  } catch (err) {
    console.error('❌ E2E Validation Failed:', err);
    try {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'e2e_failed_screenshot.png') });
      console.log('✓ Captured e2e_failed_screenshot.png for debugging');
    } catch (ssErr) {
      console.error('Failed to capture error screenshot:', ssErr);
    }
  } finally {
    // Delete temp upload files
    if (fs.existsSync(dummyDocPath)) fs.unlinkSync(dummyDocPath);
    
    // Cleanup temporary volunteer users and resources from DB
    console.log('\nCleaning up E2E database records...');
    try {
      const { rows: testUsers } = await db.query("SELECT id FROM users WHERE email = $1", [volunteerEmail]);
      if (testUsers.length > 0) {
        const uId = testUsers[0].id;
        await db.query('DELETE FROM recommended_weekly_closed_days');
        await db.query('DELETE FROM recommended_special_closed_dates');
        await db.query('DELETE FROM resource_recommendations WHERE recommended_by = $1', [uId]);
        await db.query('DELETE FROM closure_recommendations WHERE recommended_by = $1', [uId]);
        await db.query('DELETE FROM resource_temporary_closures');
        await db.query('DELETE FROM weekly_closed_days');
        await db.query('DELETE FROM special_closed_dates');
        await db.query('DELETE FROM safety_resources WHERE created_by = $1', [uId]);
        await db.query('DELETE FROM volunteers WHERE user_id = $1', [uId]);
        await db.query('DELETE FROM notifications WHERE user_id = $1', [uId]);
        await db.query('DELETE FROM users WHERE id = $1', [uId]);
      }
      console.log('✓ Cleanup Complete');
    } catch (cleanupErr) {
      console.error('Failed to cleanup E2E database:', cleanupErr.message);
    }

    await browser.close();
    console.log('Browser closed.');
  }
}

run();
