import puppeteer from 'puppeteer-core';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Users\\Sagnik\\.gemini\\antigravity\\scratch';

async function run() {
  console.log('Starting Admin Resources E2E test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err.toString());
  });

  try {
    // Login as Admin
    console.log('Logging in as admin...');
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
    await page.type('input[placeholder="name@example.com"]', 'admin@flare.local');
    await page.type('input[placeholder="••••••••••••"]', 'Admin@Flare2026');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in as admin. URL:', page.url());

    // Navigate to /admin/resources
    console.log('Navigating to safety resources...');
    await page.goto('http://localhost:5173/admin/resources', { waitUntil: 'networkidle2' });
    console.log('Current URL:', page.url());

    // Click Add Resource
    console.log('Clicking Add Resource...');
    const addBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Add Resource') || b.textContent.includes('Register First Location'));
    });

    if (!addBtnHandle.asElement()) {
      throw new Error('Add Resource button not found');
    }

    await addBtnHandle.asElement().click();
    console.log('Add Resource clicked.');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fill form fields
    console.log('Filling form fields...');
    await page.type('input[id^="input-"][placeholder="City General Precinct 4"]', 'E2E Test Precinct');
    await page.select('select[id^="select-"]', 'police_station');
    await page.type('input[placeholder="+1234567890"]', '12345678901');
    await page.type('input[placeholder="Street details, landmarks"]', '999 Safety Ave, E2E City');
    await page.type('input[placeholder="e.g. 37.7749"]', '37.7749');
    await page.type('input[placeholder="e.g. -122.4194"]', '-122.4194');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'admin_res_form_filled.png') });

    // Click Save Resource
    console.log('Clicking Save Resource...');
    const saveBtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Save Resource'));
    });

    if (!saveBtnHandle.asElement()) {
      throw new Error('Save Resource button not found');
    }

    await saveBtnHandle.asElement().click();
    console.log('Save Resource clicked.');

    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'admin_res_list_updated.png') });

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

run();
