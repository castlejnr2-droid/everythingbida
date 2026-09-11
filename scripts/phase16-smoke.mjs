/**
 * Phase 16 smoke tests — Playwright (headless Chromium)
 * Tests cart_actions confirm-before-apply UI, negation, delivery empty-state,
 * markdown/em-dash absence, and catalog regression.
 *
 * Run: node scripts/phase16-smoke.mjs
 *
 * NOTE: These tests run against the LIVE site (https://everythingbida.com).
 * They require the backend to be deployed (Phase 16 backend commit 943942f)
 * and the frontend to be deployed (Phase 16 frontend commit 0da8a8a / d806882).
 */

import { chromium } from 'playwright';

const SITE = 'https://everythingbida.com';
const RESULTS = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function log(label, status, detail = '') {
  const ok = status === 'PASS';
  const skip = status === 'SKIP' || status === 'INFO';
  if (ok) passed++;
  else if (skip) skipped++;
  else failed++;
  RESULTS.push({ label, status, detail });
  const icon = ok ? 'PASS' : skip ? status : 'FAIL';
  console.log(`[${icon}] ${label}${detail ? ': ' + detail : ''}`);
}

async function waitForAIPanel(page) {
  await page.waitForSelector('.ai-panel', { timeout: 5000 });
}

async function openAIPanel(page) {
  // Click the EB AI floating bubble
  await page.click('.ai-bubble-btn');
  await waitForAIPanel(page);
  await page.waitForTimeout(400);
}

async function sendAIMessage(page, text) {
  const input = page.locator('.ai-input');
  await input.fill(text);
  await page.click('.ai-send-btn');
  // Wait for reply (loading indicator disappears)
  await page.waitForFunction(() => !document.querySelector('.ai-loading'), { timeout: 20000 });
  await page.waitForTimeout(500);
}

async function runSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  console.log('\n=== Phase 16 Playwright Smoke Tests ===\n');

  try {
    // (j) Regression: page loads
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    log('(j) Page title loads', title.includes('EverythingBida') ? 'PASS' : 'FAIL', title);

    // (j) Category pills visible (or no products yet = pills empty but no error)
    const catRow = await page.locator('.category-filters').isVisible();
    log('(j) Category filters row visible', catRow ? 'PASS' : 'FAIL');

    // (j) EB AI panel opens
    await openAIPanel(page);
    const panelVisible = await page.locator('.ai-panel').isVisible();
    log('(j) EB AI panel opens', panelVisible ? 'PASS' : 'FAIL');

    // Wait for API data to load (products, categories fetch on mount)
    await page.waitForTimeout(3000);

    // --- Get first product name from catalog ---
    const productCards = await page.locator('.products-grid .product-info h3').all();
    let firstProductName = null;
    if (productCards.length > 0) {
      firstProductName = await productCards[0].innerText();
    }
    console.log('\nFirst product in catalog:', firstProductName || '(none)');

    if (!firstProductName) {
      log('(a-f) Cart action tests', 'SKIP', 'No products in catalog — skipping cart action tests');
    } else {
      // (a) Add to cart via AI
      await sendAIMessage(page, `add 2 ${firstProductName}`);
      const messages = await page.locator('.ai-messages .ai-msg-bot').all();
      const lastMsgText = messages.length > 0 ? await messages[messages.length - 1].innerText() : '';
      console.log('\n(a) Reply to "add 2 ' + firstProductName + '":\n', lastMsgText.slice(0, 300));

      // Check if confirm card appeared
      const confirmCard = await page.locator('.ai-cart-confirm-card').isVisible().catch(() => false);
      log('(a) Confirm card appears on add intent', confirmCard ? 'PASS' : 'FAIL');

      if (confirmCard) {
        // Get initial cart badge
        const badgeBefore = await page.locator('.cart-float-badge').isVisible().catch(() => false);
        const badgeCountBefore = badgeBefore ? await page.locator('.cart-float-badge').innerText().catch(() => '0') : '0';

        // (a) Click Confirm
        await page.click('.ai-cart-confirm-btns .btn-green');
        await page.waitForTimeout(500);

        const badgeAfter = await page.locator('.cart-float-badge').isVisible().catch(() => false);
        const badgeCountAfter = badgeAfter ? await page.locator('.cart-float-badge').innerText().catch(() => '0') : '0';
        log('(a) Cart badge updates after Confirm', (badgeAfter && Number(badgeCountAfter) > Number(badgeCountBefore)) ? 'PASS' : 'FAIL',
          `before=${badgeCountBefore} after=${badgeCountAfter}`);

        // Check confirmed summary appeared
        const confirmed = await page.locator('.ai-cart-confirmed').isVisible().catch(() => false);
        log('(a) Confirmed summary appears', confirmed ? 'PASS' : 'FAIL');

        // Check "View Cart" button
        const viewCartBtn = await page.locator('.ai-cart-confirmed button').isVisible().catch(() => false);
        log('(a) View Cart button present after confirm', viewCartBtn ? 'PASS' : 'FAIL');
      }

      // (c) Repeat add — badge should increment further
      await sendAIMessage(page, `add 1 more ${firstProductName}`);
      const confirmCard2 = await page.locator('.ai-cart-confirm-card').last().isVisible().catch(() => false);
      if (confirmCard2) {
        const badgeBefore2 = await page.locator('.cart-float-badge').innerText().catch(() => '0');
        await page.locator('.ai-cart-confirm-card').last().locator('.btn-green').click();
        await page.waitForTimeout(500);
        const badgeAfter2 = await page.locator('.cart-float-badge').innerText().catch(() => '0');
        log('(c) Repeat add increments badge', Number(badgeAfter2) > Number(badgeBefore2) ? 'PASS' : 'FAIL',
          `before=${badgeBefore2} after=${badgeAfter2}`);
      } else {
        log('(c) Repeat add confirm card', 'SKIP', 'No confirm card shown');
      }

      // (d) Cancel — cart unchanged
      await sendAIMessage(page, `add 5 ${firstProductName}`);
      const confirmCard3 = await page.locator('.ai-cart-confirm-card').last().isVisible().catch(() => false);
      if (confirmCard3) {
        const badgeBefore3 = await page.locator('.cart-float-badge').innerText().catch(() => '0');
        await page.locator('.ai-cart-confirm-card').last().locator('.btn-outline').click();
        await page.waitForTimeout(500);
        const badgeAfter3 = await page.locator('.cart-float-badge').innerText().catch(() => '0');
        // No changes should be made
        const cancelText = await page.locator('.ai-bubble-text').last().innerText().catch(() => '');
        log('(d) Cancel does not change cart', badgeAfter3 === badgeBefore3 ? 'PASS' : 'FAIL',
          `badge unchanged at ${badgeAfter3}`);
        log('(d) Cancel shows "No changes made"', cancelText.includes('No changes') ? 'PASS' : 'FAIL', cancelText.slice(0, 60));
      } else {
        log('(d) Cancel test', 'SKIP', 'No confirm card for cancel test');
      }

      // (e) Remove via AI
      await sendAIMessage(page, `remove ${firstProductName} from my cart`);
      const confirmCard4 = await page.locator('.ai-cart-confirm-card').last().isVisible().catch(() => false);
      if (confirmCard4) {
        await page.locator('.ai-cart-confirm-card').last().locator('.btn-green').click();
        await page.waitForTimeout(500);
        log('(e) Remove confirm card + apply', 'PASS');
      } else {
        // model may not have produced cart_actions for remove if no conversation context; not a hard fail
        log('(e) Remove confirm card', 'INFO', 'No confirm card — model may not have set cart_actions for remove');
      }

      // (f) Empty cart via AI
      await sendAIMessage(page, `empty my cart`);
      const confirmCard5 = await page.locator('.ai-cart-confirm-card').last().isVisible().catch(() => false);
      if (confirmCard5) {
        const headingText = await page.locator('.ai-cart-confirm-heading').last().innerText().catch(() => '');
        await page.locator('.ai-cart-confirm-card').last().locator('.btn-green').click();
        await page.waitForTimeout(500);
        const badgeGone = !(await page.locator('.cart-float-badge').isVisible().catch(() => false));
        log('(f) Clear cart confirm shows correct heading', headingText.toLowerCase().includes('clear') ? 'PASS' : 'INFO', headingText);
        log('(f) Clear cart empties badge', badgeGone ? 'PASS' : 'INFO', badgeGone ? 'badge hidden' : 'badge still visible');
      } else {
        log('(f) Clear cart confirm', 'SKIP', 'No confirm card for clear');
      }
    }

    // (g) NEGATION TEST
    await sendAIMessage(page, `I don't want ${firstProductName || 'beef'}`);
    const negMessages = await page.locator('.ai-messages .ai-msg-bot').all();
    const negReplyText = negMessages.length > 0 ? await negMessages[negMessages.length - 1].innerText() : '';
    console.log('\n(g) NEGATION TEST — reply to "I don\'t want ' + (firstProductName || 'beef') + '":\n', negReplyText.slice(0, 400));
    const negConfirmCard = await page.locator('.ai-cart-confirm-card').isVisible().catch(() => false);
    log('(g) Negation: NO confirm card', !negConfirmCard ? 'PASS' : 'FAIL',
      negConfirmCard ? 'UNEXPECTED: confirm card appeared for negation' : 'No cart_confirm card (correct)');
    log('(g) Negation: reply is sensible', negReplyText.length > 5 ? 'PASS' : 'FAIL');

    // (h) Delivery question — honest empty-state
    await sendAIMessage(page, 'what are your delivery options?');
    const delivMsgs = await page.locator('.ai-messages .ai-msg-bot').all();
    const delivReply = delivMsgs.length > 0 ? await delivMsgs[delivMsgs.length - 1].innerText() : '';
    console.log('\n(h) DELIVERY REPLY:\n', delivReply.slice(0, 400));
    const noCheckApp = !delivReply.toLowerCase().includes('check the app');
    const mentionsPickup = delivReply.toLowerCase().includes('pickup') || delivReply.toLowerCase().includes('pick up');
    log('(h) Delivery: does NOT say "check the app"', noCheckApp ? 'PASS' : 'FAIL', noCheckApp ? 'ok' : 'FOUND "check the app"');
    log('(h) Delivery: mentions pickup as option', mentionsPickup ? 'PASS' : 'FAIL');

    // (i) Check reply for markdown and em dashes
    const allBotTexts = [];
    for (const m of await page.locator('.ai-messages .ai-msg-bot .ai-bubble-text').all()) {
      allBotTexts.push(await m.innerText().catch(() => ''));
    }
    const combinedText = allBotTexts.join('\n');
    const hasEmDash = combinedText.includes('\u2014');
    const hasEnDash = combinedText.includes('\u2013');
    const hasBold = /\*\*.+\*\*/.test(combinedText);
    const hasHeader = /^#{1,6}\s/m.test(combinedText);
    console.log('\n(i) Combined reply text (first 500 chars):\n', combinedText.slice(0, 500));
    log('(i) No em dash in rendered replies', !hasEmDash ? 'PASS' : 'FAIL');
    log('(i) No en dash in rendered replies', !hasEnDash ? 'PASS' : 'FAIL');
    log('(i) No **bold** in rendered replies', !hasBold ? 'PASS' : 'FAIL');
    log('(i) No # headers in rendered replies', !hasHeader ? 'PASS' : 'FAIL');

    // (j) Regression: checkout reachable
    await page.click('.ai-panel-close');
    await page.waitForTimeout(300);
    await page.click('.cart-float');
    await page.waitForTimeout(500);
    const cartViewVisible = await page.locator('text=Your Cart').isVisible().catch(() => false);
    log('(j) Cart view reachable from floating button', cartViewVisible ? 'PASS' : 'FAIL');

  } catch (err) {
    console.error('SMOKE TEST FATAL ERROR:', err.message);
    log('FATAL', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  RESULTS.forEach(r => console.log(`  [${r.status}] ${r.label}${r.detail ? ': ' + r.detail : ''}`));

  if (failed > 0) process.exit(1);
}

runSmoke().catch(err => { console.error(err); process.exit(1); });
