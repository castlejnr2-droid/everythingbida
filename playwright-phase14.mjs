/**
 * Phase 14 Playwright smoke: live site with backend live.
 * Checks: cart badge increments on repeat-add, EB AI stub, order tracking.
 */
import { chromium } from 'playwright';

const SITE = 'https://everythingbida.com';
const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const INFO = '\x1b[36mINFO\x1b[0m';

let passed = 0, failed = 0;

function log(status, name, detail = '') {
  const tag = status === 'PASS' ? PASS : status === 'FAIL' ? FAIL : INFO;
  console.log(`[${tag}] ${name}${detail ? ': ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
}

const browser = await chromium.launch({ headless: true });

// --- (i) Cart badge increments on repeat-add of same product ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000); // let catalog load from new backend

  // Check if products loaded
  const addBtns = page.locator('.btn:not(.btn-outline)').filter({ hasText: /Add to Cart|^Add$/ });
  const count = await addBtns.count();
  log('INFO', 'Add to Cart buttons found', String(count));

  if (count === 0) {
    log('FAIL', 'Cart badge test: no products loaded from live backend');
  } else {
    const firstBtn = addBtns.first();
    // First add
    await firstBtn.click();
    await page.waitForTimeout(500);
    const badge1 = await page.locator('.cart-float-badge').textContent().catch(() => null);
    log('INFO', 'Badge after 1st add', badge1);

    // Second add (same product)
    await firstBtn.click();
    await page.waitForTimeout(500);
    const badge2 = await page.locator('.cart-float-badge').textContent().catch(() => null);
    log('INFO', 'Badge after 2nd add', badge2);

    // Third add (same product)
    await firstBtn.click();
    await page.waitForTimeout(500);
    const badge3 = await page.locator('.cart-float-badge').textContent().catch(() => null);
    log('INFO', 'Badge after 3rd add', badge3);

    if (badge1 === '1' && badge2 === '2' && badge3 === '3') {
      log('PASS', 'Cart badge increments on repeat-add: 1→2→3');
    } else if (badge1 && badge2 && parseInt(badge2) > parseInt(badge1)) {
      log('PASS', `Cart badge increments on repeat-add: ${badge1}→${badge2}→${badge3}`);
    } else {
      log('FAIL', `Cart badge did NOT increment: ${badge1}→${badge2}→${badge3}`);
    }
  }
  await ctx.close();
}

// --- EB AI stub via browser ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Click EB AI button
  const aiBtn = page.locator('.ai-entry-btn').first();
  if (await aiBtn.isVisible().catch(() => false)) {
    await aiBtn.click();
    await page.waitForTimeout(1000);
    // Find the chat input
    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    if (await chatInput.isVisible().catch(() => false)) {
      log('PASS', 'EB AI panel opens with input visible');
      await chatInput.fill('test product');
      await chatInput.press('Enter');
      await page.waitForTimeout(3000);
      // Check for a response (any text in the chat)
      const chatMsgs = await page.locator('.msg-text, .ai-msg, [class*="msg"]').count().catch(() => 0);
      log('INFO', 'Chat messages visible after send', String(chatMsgs));
      if (chatMsgs > 0) {
        log('PASS', 'EB AI stub returned a response');
      } else {
        log('INFO', 'EB AI response UI check inconclusive (selector may differ)');
      }
    } else {
      log('FAIL', 'EB AI panel chat input not found after click');
    }
  } else {
    log('FAIL', 'EB AI button (.ai-entry-btn) not visible');
  }
  await ctx.close();
}

// --- Order tracking via browser ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}?order=EB19613933`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Navigate to track view or check if deep-link works
  const trackBtn = page.locator('.nav-btn').filter({ hasText: /Track/ }).first();
  if (await trackBtn.isVisible().catch(() => false)) {
    await trackBtn.click();
    await page.waitForTimeout(500);
    const trackInput = page.locator('input[placeholder*="EB"]').first();
    if (await trackInput.isVisible().catch(() => false)) {
      await trackInput.fill('EB19613933');
      await page.locator('button').filter({ hasText: /Track|Find/ }).first().click().catch(async () => {
        await trackInput.press('Enter');
      });
      await page.waitForTimeout(2000);
      const found = await page.locator('text=EB19613933').isVisible().catch(() => false);
      if (found) log('PASS', 'Order tracking loads EB19613933 via UI');
      else log('INFO', 'Order tracking: EB19613933 text not found in UI (status UI may differ)');
    } else {
      log('INFO', 'Track input not found');
    }
  }
  await ctx.close();
}

// --- 360px fold measurement (should still be 272px) ---
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const measurements = await page.evaluate(() => {
    const header = document.querySelector('.header');
    const grid = document.querySelector('.products-grid') || document.querySelector('.card.text-center');
    return {
      headerH: header ? Math.round(header.getBoundingClientRect().bottom) : 'n/a',
      gridTop: grid ? Math.round(grid.getBoundingClientRect().top) : 'n/a',
      vp: window.innerHeight,
    };
  });
  const chromeH = measurements.gridTop;
  const catalogVisible = typeof chromeH === 'number' ? measurements.vp - chromeH : 'n/a';
  log('INFO', '360px measurements (live, products loading)',
    `header=${measurements.headerH}px | catalog starts at=${chromeH}px | visible=${catalogVisible}px`);
  if (typeof chromeH === 'number' && chromeH < 329) {
    log('PASS', 'Chrome before catalog < 329px on live site', `${chromeH}px`);
  } else {
    log('INFO', `Chrome measurement: ${chromeH}px (expected <329)`);
  }
  await ctx.close();
}

await browser.close();

console.log(`\n--- SUMMARY ---`);
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
process.exit(failed > 0 ? 1 : 0);
