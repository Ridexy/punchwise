// End-to-end QA against a running preview server (npm run preview).
// Writes docs-friendly results to ../docs/timecard/test-report-e2e.json and prints a summary.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const results = [];
const errorsByPage = {};
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false, error: String(e.message || e).split('\n')[0] }); console.log('FAIL', name, '-', String(e.message || e).split('\n')[0]); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const ROUTES = ['/', '/hours-calculator/', '/overtime-calculator/', '/time-to-decimal/', '/military-time-converter/', '/printable-timesheet/', '/privacy/', '/saved/', '/view/'];

const browser = await chromium.launch();
async function ctxFor(device) {
  const ctx = await browser.newContext({ ...(device ? devices[device] : { viewport: { width: 1280, height: 900 } }), acceptDownloads: true, baseURL: BASE });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  return ctx;
}
function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') (errorsByPage[label] ||= []).push(m.text()); });
  page.on('pageerror', (e) => (errorsByPage[label] ||= []).push(String(e)));
}
const ready = (p) => p.waitForSelector('[data-testid=day-0] input[type=time]:not([disabled])');
const setDay = async (p, day, i, start, end) => {
  await p.fill(`[aria-label="${day} shift ${i} clock in"]`, start);
  await p.fill(`[aria-label="${day} shift ${i} clock out"]`, end);
};

// 1. Responsiveness + console errors + hydration, every page, three viewports
for (const dev of ['iPhone SE', 'Pixel 7', null]) {
  const ctx = await ctxFor(dev);
  for (const r of ROUTES) {
    await test(`layout ${dev || 'desktop 1280'} ${r}: no horizontal scroll, no console errors`, async () => {
      const p = await ctx.newPage();
      const label = `${dev || 'desktop'} ${r}`;
      watch(p, label);
      await p.goto(r);
      await p.waitForLoadState('networkidle');
      const { sw, w } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
      expect(sw <= w + 1, `page is ${sw}px wide in a ${w}px viewport`);
      expect(!(errorsByPage[label] || []).length, `console errors: ${(errorsByPage[label] || []).join(' | ')}`);
      await p.close();
    });
  }
  await ctx.close();
}

// 2. Core calculator on a phone
{
  const ctx = await ctxFor('Pixel 7');
  const p = await ctx.newPage();
  watch(p, 'calc');
  await p.goto('/');
  await ready(p);
  await test('single shift with 30 min break = 8:15 / 8.25', async () => {
    await setDay(p, 'Monday', 1, '08:30', '17:15');
    await p.click('[aria-label="Monday unpaid break in minutes"] >> [aria-label="30 minute break"]');
    expect((await p.textContent('[data-testid=day-total-1]')) === '8:15', 'Monday total');
    expect((await p.textContent('[data-testid=total-dec]')) === '8.25', 'decimal total');
  });
  await test('split shift (two in/out pairs) adds up', async () => {
    await setDay(p, 'Tuesday', 1, '07:00', '11:00');
    await p.click('[data-testid=day-2] >> text=+ Add shift');
    await setDay(p, 'Tuesday', 2, '12:00', '16:30');
    expect((await p.textContent('[data-testid=day-total-2]')) === '8:30', `got ${await p.textContent('[data-testid=day-total-2]')}`);
  });
  await test('overnight shift 22:00 to 06:00 = 8:00', async () => {
    await setDay(p, 'Wednesday', 1, '22:00', '06:00');
    expect((await p.textContent('[data-testid=day-total-3]')) === '8:00', 'overnight');
  });
  await test('"Same as previous day" copies shifts', async () => {
    await p.click('[data-testid=day-4] >> text=Same as Wednesday');
    expect((await p.textContent('[data-testid=day-total-4]')) === '8:00', 'copied');
  });
  await test('weekly overtime: 48:45 worked -> 8:45 overtime and correct pay at $20', async () => {
    await setDay(p, 'Friday', 1, '06:00', '18:00'); // 12h
    await setDay(p, 'Saturday', 1, '09:00', '13:00'); // 4h  -> 8:15+8:30+8+8+12+4 = 48:45
    await p.fill('#rate', '20');
    expect((await p.textContent('[data-testid=total-hm]')) === '48:45', `total ${await p.textContent('[data-testid=total-hm]')}`);
    // 40 x 20 + 8.75 x 30 = 800 + 262.50
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,062.50', `pay ${await p.textContent('[data-testid=total-pay]')}`);
  });
  await test('daily+weekly preset: a 13 h day earns 1 h double time, no double counting ($1,102.50)', async () => {
    await p.check('input[name=preset] >> nth=1');
    await setDay(p, 'Friday', 1, '05:00', '18:00'); // 13h -> week 49:45
    // daily OT: Mon 0:15, Tue 0:30, Fri 4:00; DT Fri 1:00; regular 44 -> weekly cap 40 -> +4 OT
    // pay = 40x20 + 8.75x30 + 1x40 = 800 + 262.50 + 40
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,102.50', `pay ${await p.textContent('[data-testid=total-pay]')}`);
    expect(/Double time\s*1:00/.test(await p.textContent('dl')), 'double time 1:00');
    await setDay(p, 'Friday', 1, '06:00', '18:00');
    await p.check('input[name=preset] >> nth=0');
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,062.50', 'back to weekly');
  });
  await test('empty / incomplete fields warn without breaking totals', async () => {
    await p.fill('[aria-label="Sunday shift 1 clock in"]', '09:00');
    expect(/only one time filled/.test(await p.textContent('main')), 'warning shown');
    await p.click('[aria-label="Remove Sunday shift 1"]');
  });
  await test('biweekly switch shows 14 days and keeps entered hours', async () => {
    await p.getByRole('button', { name: 'Biweekly (2 weeks)' }).click();
    expect(await p.locator('[data-testid^=day-total-]').count() === 14, '14 days');
    expect((await p.textContent('[data-testid=total-hm]')) === '48:45', 'hours kept');
    await p.getByRole('button', { name: 'Weekly', exact: true }).click();
    expect(await p.locator('[data-testid^=day-total-]').count() === 7, 'back to 7 days');
  });
  await test('long names do not overflow the layout', async () => {
    await p.fill('#emp', 'Maximiliana Alexandrovna Fitzgerald-Montgomery de la Cruz');
    await p.fill('#co', 'Extraordinarily Long Company Name Holdings International Limited Partnership');
    const { sw, w } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    expect(sw <= w + 1, 'overflow');
    await p.fill('#emp', 'Ana Lima');
    await p.fill('#co', 'Acme Café');
  });
  await test('refresh recovery: data survives a reload (IndexedDB)', async () => {
    await p.waitForTimeout(700);
    await p.reload();
    await ready(p);
    await p.waitForFunction(() => document.querySelector('[data-testid=total-hm]')?.textContent === '48:45', null, { timeout: 5000 });
    expect((await p.inputValue('#emp')) === 'Ana Lima', 'name restored');
  });
  await test('PDF download produces a valid PDF', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download PDF')]);
    const path = await dl.path();
    const buf = fs.readFileSync(path);
    expect(buf.subarray(0, 5).toString() === '%PDF-', 'not a PDF');
    expect(buf.length > 2000, 'PDF too small');
    expect(/timesheet-ana-lima-\d{4}-\d{2}-\d{2}\.pdf/.test(dl.suggestedFilename()), dl.suggestedFilename());
  });
  await test('CSV download has a row per day', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download CSV')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    expect(csv.split('\r\n').filter((l) => /^\d{4}-\d{2}-\d{2},/.test(l)).length === 7, 'rows');
  });
  await test('signature drawing (touch/mouse) is captured and shown', async () => {
    await p.click('text=Sign timesheet');
    const box = await p.locator('canvas').boundingBox();
    await p.mouse.move(box.x + 20, box.y + 60);
    await p.mouse.down();
    for (let k = 0; k < 12; k++) await p.mouse.move(box.x + 30 + k * 18, box.y + 60 + (k % 2 ? 30 : -20));
    await p.mouse.up();
    await p.click('text=Use signature');
    await p.waitForSelector('img[alt="Your signature"]');
  });
  let shareUrl = '';
  await test('loop 1: "Send timesheet" builds a /view/ link with the data in the fragment', async () => {
    await p.click('main >> text=Send timesheet');
    shareUrl = await p.inputValue('#share-url');
    expect(/\/view\/#d=/.test(shareUrl), shareUrl);
    expect(shareUrl.length < 1200, `link length ${shareUrl.length}`);
    expect(await p.locator('a[href^="https://wa.me/?text="]').count() === 1, 'whatsapp');
    expect(await p.locator('a[href^="mailto:"]').count() === 1, 'email');
    await p.keyboard.press('Escape');
    expect(await p.locator('[role=dialog]').count() === 0, 'Escape closes dialog');
  });
  await test('loop 1: manager opens the link in a fresh browser and sees the same totals', async () => {
    const ctx2 = await ctxFor('iPhone SE');
    const m = await ctx2.newPage();
    watch(m, 'view');
    await m.goto(shareUrl.replace(/^https?:\/\/[^/]+/, BASE));
    await m.waitForSelector('h1:has-text("Ana Lima")');
    expect((await m.textContent('[data-testid=total-hm]')) === '48:45', 'view totals');
    expect((await m.textContent('[data-testid=total-pay]')) === '$1,062.50', 'view pay');
    await m.click('text=Sign as supervisor');
    const box = await m.locator('canvas').boundingBox();
    await m.mouse.move(box.x + 20, box.y + 50); await m.mouse.down(); await m.mouse.move(box.x + 200, box.y + 90); await m.mouse.up();
    await m.click('text=Use signature');
    const [dl] = await Promise.all([m.waitForEvent('download'), m.click('text=Download PDF')]);
    expect(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'pdf');
    expect(await m.locator('a[href="/#team"]').count() === 1, 'team CTA present');
    await m.click('a[href="/#team"]');
    await m.waitForSelector('[role=dialog][aria-label="Create a team link"]');
    expect(!(errorsByPage.view || []).length, (errorsByPage.view || []).join('|'));
    await ctx2.close();
  });
  await test('broken share link shows a helpful message', async () => {
    await p.goto('/view/#d=garbage');
    await p.waitForSelector('text=This timesheet link is incomplete');
    await p.goto('/');
    await ready(p);
  });
  let teamUrl = '';
  await test('loop 2: manager creates a team link', async () => {
    await p.getByRole('button', { name: 'Create a team link' }).click();
    await p.fill('#t-co', 'Acme Café');
    await p.fill('#t-mg', 'Sam');
    await p.getByRole('button', { name: 'Create link', exact: true }).click();
    teamUrl = await p.inputValue('#share-url');
    expect(/\/#setup=/.test(teamUrl), teamUrl);
    await p.keyboard.press('Escape');
  });
  await test('loop 2: employee opens team link -> preconfigured, "Send to Sam"', async () => {
    const ctx3 = await ctxFor('Pixel 7');
    const e = await ctx3.newPage();
    await e.goto(teamUrl.replace(/^https?:\/\/[^/]+/, BASE));
    await ready(e);
    await e.waitForSelector('text=Set up by');
    expect((await e.inputValue('#co')) === 'Acme Café', 'company prefilled');
    expect(await e.locator('main >> text=Send to Sam').count() >= 1, 'send-to button');
    expect(!(await e.evaluate(() => location.hash)), 'fragment cleared after applying');
    await ctx3.close();
  });
  await test('saved list, backup export, delete and restore', async () => {
    await p.goto('/saved/');
    await p.waitForSelector('[data-testid=saved-item]');
    const before = await p.locator('[data-testid=saved-item]').count();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download backup')]);
    const backupPath = await dl.path();
    expect(JSON.parse(fs.readFileSync(backupPath, 'utf8')).sheets.length === before, 'backup count');
    p.once('dialog', (d) => d.accept());
    await p.locator('[data-testid=saved-item]').first().getByRole('button', { name: 'Delete' }).click();
    await p.waitForFunction((n) => document.querySelectorAll('[data-testid=saved-item]').length === n - 1, before);
    await p.setInputFiles('input[type=file]', backupPath);
    await p.waitForSelector('text=/Restored \\d+ timesheet/');
    expect(await p.locator('[data-testid=saved-item]').count() === before, 'restored');
  });
  await test('keyboard: skip link is first, controls reachable, dialog traps Escape', async () => {
    await p.goto('/');
    await ready(p);
    await p.keyboard.press('Tab');
    expect((await p.evaluate(() => document.activeElement?.textContent)) === 'Skip to content', 'skip link first');
    let reached = false;
    for (let k = 0; k < 40 && !reached; k++) {
      await p.keyboard.press('Tab');
      reached = (await p.evaluate(() => document.activeElement?.getAttribute('aria-label') || '')).includes('Monday shift 1 clock in');
    }
    expect(reached, 'reached Monday clock-in by keyboard');
  });
  await ctx.close();
}

// 3. Tool pages + shareable result links (loop 4)
{
  const ctx = await ctxFor('iPhone SE');
  const p = await ctx.newPage();
  await test('hours calculator: default 9:00-17:30 minus 30 = 8:00; updates hash', async () => {
    await p.goto('/hours-calculator/');
    await p.waitForLoadState('networkidle');
    expect((await p.textContent('[data-testid=hours-result]')) === '8:00', 'hours');
    await p.fill('#end', '18:00');
    expect((await p.textContent('[data-testid=hours-result]')) === '8:30', 'hours after edit');
    expect((await p.evaluate(() => location.hash)).includes('end=18'), 'hash state');
  });
  await test('hours calculator: shared result link restores inputs', async () => {
    await p.goto('/hours-calculator/#start=22%3A00&end=06%3A00&brk=0');
    await p.waitForFunction(() => document.querySelector('[data-testid=hours-result]')?.textContent === '8:00');
    expect(/overnight/.test(await p.textContent('main')), 'overnight note');
  });
  await test('overtime calculator: $20, 46 h -> $980.00, OT $180.00', async () => {
    await p.goto('/overtime-calculator/');
    await p.waitForLoadState('networkidle');
    expect((await p.textContent('[data-testid=ot-total]')) === '$980.00', await p.textContent('[data-testid=ot-total]'));
    expect((await p.textContent('[data-testid=ot-pay]')) === '$180.00', 'ot pay');
  });
  await test('time to decimal: 8:20 -> 8.33 via link; 7.75 -> 7:45', async () => {
    await p.goto('/time-to-decimal/#hm=8%3A20');
    await p.waitForFunction(() => document.querySelector('[data-testid=dec-result]')?.textContent === '8.33');
    expect((await p.textContent('[data-testid=hm-result]')) === '7:45', 'reverse');
  });
  await test('military time: 7:30 PM -> 1930; 0005 -> 12:05 AM', async () => {
    await p.goto('/military-time-converter/');
    await p.waitForLoadState('networkidle');
    expect((await p.textContent('[data-testid=mil-result]')) === '1930', 'to mil');
    await p.fill('#mil', '0005');
    expect((await p.textContent('[data-testid=std-result]')) === '12:05 AM', 'to std');
  });
  await test('printable timesheet downloads a blank biweekly A4 PDF', async () => {
    await p.goto('/printable-timesheet/');
    await p.selectOption('#per', 'biweekly');
    await p.selectOption('#pap', 'a4');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download blank biweekly timesheet (PDF)')]);
    expect(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'pdf');
    expect(dl.suggestedFilename() === 'biweekly-timesheet-a4.pdf', dl.suggestedFilename());
  });
  await ctx.close();
}

// 4. Offline (service worker) + prerendered HTML without JavaScript
{
  await test('pages render meaningful content with JavaScript disabled (SEO)', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL: BASE });
    const p = await ctx.newPage();
    for (const [r, h1] of [['/', 'Time Card Calculator'], ['/overtime-calculator/', 'Overtime Calculator'], ['/time-to-decimal/', 'Time to Decimal Calculator']]) {
      await p.goto(r);
      expect((await p.textContent('h1')) === h1, `${r} h1`);
      expect((await p.locator('main p').count()) > 5, `${r} has content`);
      expect(await p.locator('link[rel=canonical]').count() === 1, 'canonical');
    }
    await ctx.close();
  });
  await test('offline: after first visit, calculator and tool pages load with no network', async () => {
    const ctx = await ctxFor('Pixel 7');
    const p = await ctx.newPage();
    await p.goto('/');
    await p.evaluate(async () => { await navigator.serviceWorker.ready; });
    await p.reload();
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await p.goto('/overtime-calculator/');
    expect((await p.textContent('h1')) === 'Overtime Calculator', 'offline tool page');
    await p.goto('/');
    await ready(p);
    await setDay(p, 'Monday', 1, '09:00', '17:00');
    expect((await p.textContent('[data-testid=day-total-1]')) === '8:00', 'offline calc');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Download PDF')]);
    expect(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'offline pdf');
    await ctx.close();
  });
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
fs.writeFileSync(new URL('../../docs/timecard/test-report-e2e.json', import.meta.url), JSON.stringify({ base: BASE, date: new Date().toISOString(), passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
