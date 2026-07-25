import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = 'C:\\Users\\Sagnik\\.gemini\\antigravity\\brain\\3a2ba45e-0e4f-48fd-8718-09f357827421';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('Starting screenshot capture for active SOS incident tracker...');

  // Setup DB connection
  const db = new pg.Pool({
    user: process.env.DB_USER || 'ai_user',
    password: process.env.DB_PASSWORD || 'hello123',
    host: 'localhost',
    database: 'flare_db',
    port: 5432,
  });

  const uniqueId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const womanEmail = `woman_tracker_${Date.now()}@test.com`;
  const password = 'Password123!';

  // Clean up any existing test records first
  await db.query(`DELETE FROM emergency_incidents WHERE user_id = '${uniqueId}'`);
  await db.query(`DELETE FROM users WHERE id = '${uniqueId}'`);

  // Insert test user
  await db.query(`
    INSERT INTO users (id, full_name, email, password_hash, role)
    VALUES ('${uniqueId}', 'Jane SOS Tracker', '${womanEmail}', '$2b$10$wN9aWd4M76p3Uq0m271zOOb1t9M4k7916yR3Q91H99h88h77g66f5', 'woman')
  `);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // Mock Nominatim reverse geocoding API
  await page.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options) {
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
      if (urlStr.includes('nominatim.openstreetmap.org')) {
        return new Response(JSON.stringify({
          display_name: 'Kolkata, West Bengal, India',
          lat: '22.572648',
          lon: '88.363895'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch.apply(this, arguments);
    };
  });

  try {
    console.log('Logging in as woman user...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', womanEmail);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await delay(3000);

    console.log('Triggering SOS incident...');
    console.log('Finding and holding down the SOS button...');
    await page.waitForSelector('button');
    
    // Log all button texts to see what's on the page
    const buttonTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent);
    });
    console.log('Available buttons:', buttonTexts);

    const buttonHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('SOS') || b.textContent.includes('sos') || b.innerHTML.includes('ShieldAlert'));
    });

    if (buttonHandle.asElement()) {
      const box = await buttonHandle.asElement().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      console.log('Holding SOS button...');
      await delay(3500); // Wait for the 3s hold trigger to complete
      await page.mouse.up();
      console.log('Released SOS button.');
    } else {
      throw new Error('SOS button not found');
    }
    await delay(2500); // Wait for redirect to /sos/tracker

    console.log('Taking screenshot of active SOS incident tracker page...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_active_sos_tracker.png') });
    console.log('✓ Captured 17_active_sos_tracker.png');

    console.log('Resolving the SOS incident...');
    // Click Resolve SOS button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Resolve SOS'));
      if (btn) btn.click();
    });
    await delay(2000);

  } catch (err) {
    console.error('Error during SOS tracker screenshot capture:', err);
  } finally {
    // Cleanup db record
    await db.query(`DELETE FROM emergency_incidents WHERE user_id = '${uniqueId}'`);
    await db.query(`DELETE FROM users WHERE id = '${uniqueId}'`);
    await db.end();
    await browser.close();
    console.log('Finished.');
  }
}

run();
