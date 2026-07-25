import puppeteer from 'puppeteer-core';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Users\\Sagnik\\.gemini\\antigravity\\scratch';

async function run() {
  console.log('Starting SOS Resolve reproduction...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER LOG] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err.toString());
  });

  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // Override geolocation permission
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('http://localhost:5173', ['geolocation']);
    
    // Set mock coordinates
    await page.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
    console.log('Mock geolocation overridden.');

    const uniqueEmail = `test_rep_${Date.now()}@test.com`;

    // 1. Register a new Woman account
    console.log(`Registering new user with email: ${uniqueEmail}...`);
    await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle2' });
    
    // Fill register inputs with React-compliant value setters
    const setVal = (selector, value) => page.$eval(selector, (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

    await setVal('input[placeholder="Jane Doe"]', 'Test Rep User');
    console.log('uniqueEmail variable:', uniqueEmail);
    await setVal('input[placeholder="jane@example.com"]', uniqueEmail);
    await setVal('input[placeholder="Minimum 6 characters"]', 'flare2026');

    const browserEmail = await page.$eval('input[placeholder="jane@example.com"]', el => el.value);
    console.log('Browser email value:', browserEmail);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_01a_register_filled.png') });

    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait a brief moment to capture any inline validation error or immediate transition
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_01c_after_submit.png') });

    // Wait for URL to be /dashboard
    console.log('Waiting for redirection to /dashboard...');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
    console.log('Registered and auto-logged in. Current URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_01b_dashboard.png') });

    // Wait for GPS lock in the UI
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Trigger SOS
    console.log('Triggering SOS...');
    const sosButtonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('HOLD') || b.textContent.includes('SOS'));
    });

    if (!sosButtonHandle.asElement()) {
      throw new Error('SOS button not found');
    }

    const box = await sosButtonHandle.asElement().boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    console.log('Mouse down on SOS button...');
    await new Promise(resolve => setTimeout(resolve, 3800)); // hold for 3.8s to be safe
    await page.mouse.up();
    console.log('Mouse up.');

    // Wait for URL to be /sos/tracker
    console.log('Waiting for redirection to /sos/tracker...');
    await page.waitForFunction(() => window.location.pathname === '/sos/tracker', { timeout: 15000 });
    console.log('Redirection done. Current URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_02_tracker.png') });

    // Wait for RTK Query loading to finish and "Mark Safe" button to appear
    console.log('Waiting for Mark Safe button to appear in DOM...');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Mark Safe'));
    }, { timeout: 15000 });

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_02b_tracker_loaded.png') });

    // 3. Mark Safe & Resolve
    console.log('Resolving SOS...');
    const markSafeBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Mark Safe'));
    });

    if (!markSafeBtnHandle.asElement()) {
      throw new Error('Mark Safe button not found after waiting');
    }

    await markSafeBtnHandle.asElement().click();
    console.log('Clicked Deactivate & Mark Safe.');

    // Wait for modal input
    await page.waitForSelector('input');
    await page.type('input', 'Everything is fine, manual verification.');
    
    // Click Resolve Alarm button in modal
    const resolveBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Resolve Alarm'));
    });

    if (!resolveBtnHandle.asElement()) {
      throw new Error('Resolve Alarm button not found');
    }

    await resolveBtnHandle.asElement().click();
    console.log('Clicked Resolve Alarm.');
    
    console.log('Waiting for redirection after resolution...');
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 15000 });
    console.log('Final URL:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'rep_03_resolved.png') });

  } catch (err) {
    console.error('Error during reproduction:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
