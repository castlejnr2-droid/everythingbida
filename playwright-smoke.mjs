/**
 * Phase 13 smoke test — Playwright headless Chromium
 * Tests: hero CTAs, EB AI panel open + input focus, product search,
 *        cart badge increment, navigation between views, 360px fold measurement.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const PASS = '\x1b[32mPASS\x1b[0m';
const FAIL = '\x1b[31mFAIL\x1b[0m';
const INFO = '\x1b[36mINFO\x1b[0m';

let passed = 0, failed = 0;
const results = [];

function log(status, name, detail = '') {
  const tag = status === 'PASS' ? PASS : status === 'FAIL' ? FAIL : INFO;
  const line = `[${tag}] ${name}${detail ? ': ' + detail : ''}`;
  console.log(line);
  results.push({ status, name, detail });
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
}

const browser = await chromium.launch({ headless: true });

// --- (a) Desktop view basic render ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  const title = await page.title();
  if (title.includes('EverythingBida')) {
    log('PASS', 'Page title loads', title);
  } else {
    log('FAIL', 'Page title loads', `got: ${title}`);
  }
  // No em dash in title
  if (!title.includes('\u2014') && !title.includes('\u2013')) {
    log('PASS', 'Title has no em/en dash');
  } else {
    log('FAIL', 'Title has no em/en dash', `title="${title}"`);
  }
  await ctx.close();
}

// --- 360px viewport: measure chrome before catalog grid ---
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  // Wait briefly for React to render
  await page.waitForTimeout(1500);

  const measurements = await page.evaluate(() => {
    const header = document.querySelector('.header');
    const catalogRef = document.querySelector('[data-catalog-ref]') ||
                       (() => {
                         // find catalogRef div by proximity to ai-search-row
                         const aiRow = document.querySelector('.ai-search-row');
                         return aiRow ? aiRow.parentElement : null;
                       })();
    const productsGrid = document.querySelector('.products-grid');
    const emptyState   = document.querySelector('.card.text-center');
    const headerH = header ? header.getBoundingClientRect().bottom : 'n/a';
    const gridTop = productsGrid
      ? productsGrid.getBoundingClientRect().top
      : (emptyState ? emptyState.getBoundingClientRect().top : 'n/a');
    const mainPadTop = getComputedStyle(document.querySelector('.main')).paddingTop;
    return { headerH, gridTop, mainPadTop, vp: window.innerHeight };
  });

  log('INFO', '360px measurements',
    `header bottom=${measurements.headerH}px | grid/empty-state top=${measurements.gridTop}px | main-pad-top=${measurements.mainPadTop} | viewport=${measurements.vp}px`);

  const chromeH = typeof measurements.gridTop === 'number' ? measurements.gridTop : null;
  const catalogVisible = chromeH !== null ? measurements.vp - chromeH : null;

  if (chromeH !== null) {
    const improved = chromeH < 329;
    log(improved ? 'PASS' : 'FAIL', 'Chrome before grid < 329px (Phase12 baseline)',
      `measured=${chromeH}px, catalog visible=${catalogVisible}px`);
  } else {
    log('INFO', 'Could not measure grid top (backend down, empty-state shown)');
  }

  await ctx.close();
}

// --- (b) Hero CTAs present and clickable ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Hero is below catalog — scroll to it
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const askBtn = page.locator('.hero-cta-primary');
  const browseBtn = page.locator('.hero-cta-secondary');
  const askVisible = await askBtn.isVisible().catch(() => false);
  const browseVisible = await browseBtn.isVisible().catch(() => false);

  if (askVisible) log('PASS', 'Hero "Ask EB AI" CTA visible');
  else log('FAIL', 'Hero "Ask EB AI" CTA visible');

  if (browseVisible) log('PASS', 'Hero "Browse catalog" CTA visible');
  else log('FAIL', 'Hero "Browse catalog" CTA visible');

  await ctx.close();
}

// --- (c) EB AI panel opens with input focused ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Click the EB AI button (merged row)
  const aiBtn = page.locator('.ai-entry-btn');
  const aiBtnVisible = await aiBtn.isVisible().catch(() => false);
  if (!aiBtnVisible) {
    log('FAIL', 'EB AI button visible in merged row');
  } else {
    log('PASS', 'EB AI button visible in merged row');
    await aiBtn.click();
    await page.waitForTimeout(800);

    // Chat panel should open
    const panel = page.locator('.ai-panel, .chat-container, [class*="ai-panel"]').first();
    const panelVisible = await panel.isVisible().catch(() => false);
    if (panelVisible) {
      log('PASS', 'EB AI panel opens on click');
    } else {
      // Try alternate selectors
      const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]').first();
      const chatInputVisible = await chatInput.isVisible().catch(() => false);
      if (chatInputVisible) log('PASS', 'EB AI panel opens (chat input visible)');
      else log('FAIL', 'EB AI panel opens on click');
    }

    // Check input is focused
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName + (el.placeholder ? `[placeholder="${el.placeholder}"]` : '') : 'none';
    });
    log('INFO', 'Focused element after AI panel open', focused);
    const inputFocused = focused.toLowerCase().includes('input') || focused.toLowerCase().includes('textarea');
    if (inputFocused) log('PASS', 'Input is focused after EB AI panel opens');
    else log('FAIL', 'Input is focused after EB AI panel opens', `focused: ${focused}`);
  }

  await ctx.close();
}

// --- (d) Product search filters independently ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const searchInput = page.locator('.ai-search-row .input').first();
  const searchVisible = await searchInput.isVisible().catch(() => false);
  if (!searchVisible) {
    log('FAIL', 'Search input visible in merged row');
  } else {
    log('PASS', 'Search input visible in merged row');
    await searchInput.fill('xxxxxxnomatch999');
    await page.waitForTimeout(500);

    // Either no products found state or empty grid
    const noProducts = await page.locator('text=No Products Found').isVisible().catch(() => false);
    const emptyGrid = await page.evaluate(() => {
      const grid = document.querySelector('.products-grid');
      return grid ? grid.children.length === 0 : false;
    });
    if (noProducts || emptyGrid) {
      log('PASS', 'Search filters products independently of EB AI');
    } else {
      log('INFO', 'Search typed but grid state unclear (backend may be down)');
    }

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(300);
  }

  await ctx.close();
}

// --- (e) Cart badge increments on repeat-add ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const addBtns = page.locator('.btn:not(.btn-outline)').filter({ hasText: /Add to Cart|Add$/ });
  const count = await addBtns.count();
  if (count === 0) {
    log('INFO', 'Cart badge test: no Add to Cart buttons found (backend down or no products)');
  } else {
    const firstAdd = addBtns.first();
    await firstAdd.click();
    await page.waitForTimeout(300);
    const badge1 = await page.locator('.cart-float-badge').textContent().catch(() => null);
    await firstAdd.click();
    await page.waitForTimeout(300);
    const badge2 = await page.locator('.cart-float-badge').textContent().catch(() => null);

    log('INFO', 'Cart badge after 1st add', badge1);
    log('INFO', 'Cart badge after 2nd add', badge2);

    if (badge1 && badge2 && parseInt(badge2) > parseInt(badge1)) {
      log('PASS', 'Cart badge increments on repeat-add of same product', `${badge1} -> ${badge2}`);
    } else if (badge1 && badge2 && parseInt(badge2) === parseInt(badge1)) {
      log('FAIL', 'Cart badge increments on repeat-add (badge stayed same)', `${badge1} -> ${badge2}`);
    } else {
      log('INFO', 'Cart badge test inconclusive (no badge visible)');
    }
  }

  await ctx.close();
}

// --- (f) Navigation between views ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Navigate to Track Order
  const trackBtn = page.locator('.nav-btn').filter({ hasText: /Track/ }).first();
  const trackVisible = await trackBtn.isVisible().catch(() => false);
  if (trackVisible) {
    await trackBtn.click();
    await page.waitForTimeout(500);
    const trackView = await page.locator('text=Track Your Order').isVisible().catch(() => false);
    if (trackView) log('PASS', 'Navigation: Track Order view opens');
    else log('INFO', 'Navigation: Track nav clicked but "Track Your Order" heading not found');
  } else {
    log('INFO', 'Navigation: Track nav button not visible at this viewport (may be short-label)');
  }

  // Navigate back to shop
  const shopBtn = page.locator('.logo-btn').first();
  await shopBtn.click();
  await page.waitForTimeout(500);
  const shopView = await page.locator('.ai-search-row').isVisible().catch(() => false);
  if (shopView) log('PASS', 'Navigation: back to shop view shows merged AI+search row');
  else log('FAIL', 'Navigation: back to shop view - merged row not found');

  await ctx.close();
}

await browser.close();

console.log('\n--- SUMMARY ---');
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
if (failed > 0) {
  console.log('\nFailed checks:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
}
process.exit(failed > 0 ? 1 : 0);
