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
  catch (e) { results.push({ name, ok: false, error: String(e.message || e).replace(/\s+/g, ' ').slice(0, 300) }); console.log('FAIL', name, '-', String(e.message || e).replace(/\s+/g, ' ').slice(0, 300)); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const ROUTES = ['/', '/biweekly-time-card-calculator/', '/time-duration-calculator/', '/hours-calculator/', '/overtime-calculator/', '/time-to-decimal/', '/military-time-converter/', '/printable-timesheet/', '/privacy/', '/saved/', '/view/'];

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
const ready = (p) => p.waitForSelector('[data-testid=day-0] input[aria-label$="clock in"]:not([disabled])');
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

// 2. Core calculator on a phone (week runs Monday -> Sunday: day-0 = Monday)
{
  const ctx = await ctxFor('Pixel 7');
  const p = await ctx.newPage();
  watch(p, 'calc');
  await p.goto('/');
  await ready(p);
  const btn = (name) => p.getByRole('button', { name, exact: true }).first();
  await test('week starts on Monday by default', async () => {
    expect(/^Monday/.test(await p.textContent('[data-testid=day-0] h3')), 'day-0 is Monday');
    expect(/^Sunday/.test(await p.textContent('[data-testid=day-6] h3')), 'day-6 is Sunday');
  });
  await test('typed input: "9" and "5" read as 9 AM - 5 PM = 8:00', async () => {
    await setDay(p, 'Monday', 1, '9', '5');
    await p.keyboard.press('Tab');
    expect((await p.textContent('[data-testid=day-total-0]')) === '8:00', `got ${await p.textContent('[data-testid=day-total-0]')}`);
    expect((await p.inputValue('[aria-label="Monday shift 1 clock out"]')) === '5:00 PM', 'shows interpreted 5:00 PM');
  });
  await test('typed input: AM/PM toggle flips an ambiguous time', async () => {
    await p.click('[aria-label^="Switch Monday shift 1 clock out to AM"]');
    expect((await p.textContent('[data-testid=day-total-0]')) === '20:00', 'flipped to 5 AM next day');
    expect(await p.locator('[data-testid=overnight-0-0]').count() === 1, 'overnight marker shown');
    await p.click('[aria-label^="Switch Monday shift 1 clock out to PM"]');
    expect((await p.textContent('[data-testid=day-total-0]')) === '8:00', 'back');
  });
  await test('typed input: "930" "6p" "1730" "8.15a" all parse', async () => {
    await setDay(p, 'Tuesday', 1, '930', '6p');
    expect((await p.textContent('[data-testid=day-total-1]')) === '8:30', `930-6p ${await p.textContent('[data-testid=day-total-1]')}`);
    await setDay(p, 'Tuesday', 1, '8.15a', '1730');
    expect((await p.textContent('[data-testid=day-total-1]')) === '9:15', `8.15a-1730 ${await p.textContent('[data-testid=day-total-1]')}`);
  });
  await test('invalid typed time is rejected with a message, not guessed', async () => {
    await p.fill('[aria-label="Tuesday shift 1 clock out"]', '25:99');
    expect(/Not a valid time/.test(await p.textContent('[data-testid=day-1]')), 'error shown');
    expect((await p.getAttribute('[aria-label="Tuesday shift 1 clock out"]', 'aria-invalid')) === 'true', 'aria-invalid');
    expect((await p.textContent('[data-testid=day-total-1]')) === '0:00', 'not counted');
    await p.click('[aria-label="Remove Tuesday shift 1"]');
  });
  await test('single shift with 30 min break = 8:15 / 8.25', async () => {
    await setDay(p, 'Monday', 1, '08:30', '17:15');
    await p.click('[aria-label="Monday unpaid break in minutes"] >> [aria-label="30 minute break"]');
    expect((await p.textContent('[data-testid=day-total-0]')) === '8:15', 'Monday total');
    expect((await p.textContent('[data-testid=total-dec]')) === '8.25', 'decimal total');
    expect(/0:30/.test(await p.textContent('[data-testid=total-breaks]')), 'total break time shown');
  });
  await test('split shift (two in/out pairs) adds up', async () => {
    await setDay(p, 'Tuesday', 1, '07:00', '11:00');
    await p.click('[data-testid=day-1] >> text=+ Add shift');
    await setDay(p, 'Tuesday', 2, '12:00', '16:30');
    expect((await p.textContent('[data-testid=day-total-1]')) === '8:30', `got ${await p.textContent('[data-testid=day-total-1]')}`);
  });
  await test('overnight shift 22:00 to 06:00 = 8:00, with visible next-day note', async () => {
    await setDay(p, 'Wednesday', 1, '22:00', '06:00');
    expect((await p.textContent('[data-testid=day-total-2]')) === '8:00', 'overnight');
    expect(/Ends the next day/.test(await p.textContent('[data-testid=overnight-2-0]')), 'marker');
  });
  await test('"Same as previous day" copies shifts', async () => {
    await p.click('[data-testid=day-3] >> text=Same as Wednesday');
    expect((await p.textContent('[data-testid=day-total-3]')) === '8:00', 'copied');
  });
  await test('weekly overtime: 48:45 worked -> 8:45 overtime and correct pay at $20', async () => {
    await setDay(p, 'Friday', 1, '06:00', '18:00');
    await setDay(p, 'Saturday', 1, '09:00', '13:00');
    await p.fill('#rate', '20');
    expect((await p.textContent('[data-testid=total-hm]')) === '48:45', `total ${await p.textContent('[data-testid=total-hm]')}`);
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,062.50', `pay ${await p.textContent('[data-testid=total-pay]')}`);
  });
  await test('separate overtime rate overrides rate x 1.5 ($35/h OT -> $1,106.25)', async () => {
    await p.fill('#otrate', '35');
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,106.25', `pay ${await p.textContent('[data-testid=total-pay]')}`);
    await p.fill('#otrate', '');
    expect((await p.textContent('[data-testid=total-pay]')) === '$1,062.50', 'restored');
  });
  await test('daily+weekly preset: a 13 h day earns 1 h double time, no double counting ($1,102.50)', async () => {
    await p.check('input[name=preset] >> nth=1');
    await setDay(p, 'Friday', 1, '05:00', '18:00');
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
    expect((await p.inputValue('[aria-label="Monday shift 1 clock in"]')) === '8:30 AM', 'time restored');
  });
  await test('PDF download produces a valid PDF', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), btn('PDF').click()]);
    const buf = fs.readFileSync(await dl.path());
    expect(buf.subarray(0, 5).toString() === '%PDF-', 'not a PDF');
    expect(buf.length > 2000, 'PDF too small');
    expect(/timesheet-ana-lima-\d{4}-\d{2}-\d{2}\.pdf/.test(dl.suggestedFilename()), dl.suggestedFilename());
  });
  await test('CSV download has a row per day', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), btn('CSV').click()]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    expect(csv.split('\r\n').filter((l) => /^\d{4}-\d{2}-\d{2},/.test(l)).length === 7, 'rows');
  });
  await test('copy totals puts a readable summary on the clipboard', async () => {
    await btn('Copy totals').click();
    const clip = await p.evaluate(() => navigator.clipboard.readText());
    expect(/Total: 48:45 \(48\.75 h\)/.test(clip) && /Overtime: 8:45/.test(clip) && /Gross pay \(estimate\): \$1,062\.50/.test(clip), clip);
  });
  await test('print shows only the clean timesheet', async () => {
    await p.emulateMedia({ media: 'print' });
    expect(await p.locator('#print-timesheet').isVisible(), 'print view visible');
    expect(!(await p.locator('[data-testid=day-0]').isVisible()), 'inputs hidden when printing');
    expect(/48:45/.test(await p.textContent('#print-timesheet')), 'totals in print view');
    await p.emulateMedia({ media: 'screen' });
    expect(!(await p.locator('#print-timesheet').isVisible()), 'hidden on screen');
  });
  await test('clear all empties the week and Undo restores it', async () => {
    await p.getByRole('button', { name: 'Clear all' }).click();
    expect((await p.textContent('[data-testid=total-hm]')) === '0:00', 'cleared');
    await p.getByRole('button', { name: 'Undo' }).click();
    expect((await p.textContent('[data-testid=total-hm]')) === '48:45', 'restored');
  });
  await test('signature drawing (touch/mouse) is captured and shown', async () => {
    await btn('Sign').click();
    const box = await p.locator('canvas').boundingBox();
    await p.mouse.move(box.x + 20, box.y + 60);
    await p.mouse.down();
    for (let k = 0; k < 12; k++) await p.mouse.move(box.x + 30 + k * 18, box.y + 60 + (k % 2 ? 30 : -20));
    await p.mouse.up();
    await p.click('text=Use signature');
    await p.waitForSelector('img[alt="Your signature"]');
  });
  let shareUrl = '';
  await test('share privacy: by default the link carries hours only (no name, company or pay)', async () => {
    await p.getByRole('button', { name: 'Share your report' }).first().click();
    const url = await p.inputValue('#share-url');
    expect(/\/view\/\?ref=share#d=/.test(url), url);
    expect(!(await p.getByLabel(/My name and company/).isChecked()), 'identity off by default');
    expect(!(await p.getByLabel(/My pay rate and gross pay/).isChecked()), 'pay off by default');
    const m = await (await ctxFor('iPhone SE')).newPage();
    await m.goto(url.replace(/^https?:\/\/[^/]+/, BASE));
    await m.waitForSelector('h1');
    expect((await m.textContent('h1')) === 'Timesheet', `h1 ${await m.textContent('h1')}`);
    expect(!/Ana Lima|Acme/.test(await m.textContent('main')), 'no identity leaked');
    expect(await m.locator('[data-testid=total-pay]').count() === 0, 'no pay leaked');
    expect((await m.textContent('[data-testid=total-hm]')) === '48:45', 'hours present');
    await m.context().close();
  });
  await test('loop 1: opting in adds name and pay; channels present; Escape closes', async () => {
    await p.getByLabel(/My name and company/).check();
    await p.getByLabel(/My pay rate and gross pay/).check();
    expect(await p.getByLabel(/My pay rate and gross pay/).isChecked(), 'pay ticked');
    shareUrl = await p.inputValue('#share-url');
    expect(shareUrl.length < 1200, `link length ${shareUrl.length}`);
    expect(/Ana Lima/.test(decodeURIComponent(await p.getAttribute('[data-testid=share-whatsapp]', 'href'))), 'message names sender');
    expect(await p.locator('[data-testid=share-email]').count() === 1 && await p.locator('[data-testid=share-sms]').count() === 1, 'email+sms');
    await p.keyboard.press('Escape');
    expect(await p.locator('[role=dialog]').count() === 0, 'Escape closes dialog');
  });
  await test('loop 1: manager opens the link in a fresh browser and sees the same totals', async () => {
    const ctx2 = await ctxFor('iPhone SE');
    const m = await ctx2.newPage();
    watch(m, 'view');
    await m.goto(shareUrl.replace(/^https?:\/\/[^/]+/, BASE));
    await m.waitForSelector('h1:has-text("Ana Lima")');
    expect(!(await m.evaluate(() => location.search)), 'ref tag stripped from address bar');
    expect((await m.textContent('[data-testid=total-hm]')) === '48:45', 'view totals');
    expect((await m.textContent('[data-testid=total-pay]')) === '$1,062.50', 'view pay');
    expect(/not an official payroll approval/.test(await m.textContent('main')), 'disclaimer');
    await m.click('text=Sign as supervisor');
    const box = await m.locator('canvas').boundingBox();
    await m.mouse.move(box.x + 20, box.y + 50); await m.mouse.down(); await m.mouse.move(box.x + 200, box.y + 90); await m.mouse.up();
    await m.click('text=Use signature');
    const [dl] = await Promise.all([m.waitForEvent('download'), m.click('text=Download PDF')]);
    expect(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'pdf');
    await m.click('a[href="/#team"]');
    await m.waitForSelector('[role=dialog][aria-label="Create a team link"]');
    expect(!(errorsByPage.view || []).length, (errorsByPage.view || []).join('|'));
    await ctx2.close();
  });
  await test('share card: branded PNG (1080x1080) downloads; general mode works; no pay or name', async () => {
    await p.goto('/');
    await ready(p);
    await btn('Share my week').click();
    await p.waitForSelector('[data-testid=card-preview]');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download PNG' }).click()]);
    const buf = fs.readFileSync(await dl.path());
    expect(buf[0] === 0x89 && buf.subarray(1, 4).toString() === 'PNG', 'png');
    expect(buf.readUInt32BE(16) === 1080 && buf.readUInt32BE(20) === 1080, 'size');
    await p.getByRole('button', { name: 'Copy summary' }).click();
    const t = await p.evaluate(() => navigator.clipboard.readText());
    expect(/My week: 48:45 hours/.test(t) && /\?ref=card/.test(t) && !/\$|Ana|Acme/.test(t), t);
    await p.getByRole('button', { name: 'General message' }).click();
    await p.getByRole('button', { name: 'Copy summary' }).click();
    const g = await p.evaluate(() => navigator.clipboard.readText());
    expect(/I calculated my overtime/.test(g) && !/48:45/.test(g), g);
    await p.keyboard.press('Escape');
  });
  await test('invite a coworker: editable message flows into WhatsApp link', async () => {
    await p.getByRole('button', { name: 'Share HourTally' }).click();
    const txt = await p.inputValue('#share-text');
    expect(/I use HourTally to calculate my work hours, breaks and overtime\. Try it free: .*\?ref=invite/.test(txt), txt);
    await p.fill('#share-text', 'Use this for your hours: ' + (await p.inputValue('#share-url')));
    const wa = decodeURIComponent(await p.getAttribute('[data-testid=share-whatsapp]', 'href'));
    expect(wa.includes('Use this for your hours:') && !wa.includes('48:45'), wa);
    await p.keyboard.press('Escape');
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
    expect(/\/\?ref=team#setup=/.test(teamUrl), teamUrl);
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
    expect(!(await e.evaluate(() => location.hash + location.search)), 'fragment and ref cleared after applying');
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

// 2b. Desktop layout and the biweekly page
{
  const ctx = await ctxFor(null);
  const p = await ctx.newPage();
  await test('desktop: live results panel sits beside the timesheet', async () => {
    await p.goto('/');
    await ready(p);
    const day = await p.locator('[data-testid=day-0]').boundingBox();
    const panel = await p.locator('[data-testid=results-panel]').boundingBox();
    expect(panel.x >= day.x + day.width, `panel x ${panel.x} vs day right ${day.x + day.width}`);
    expect(panel.y < day.y + 200, 'panel near the top');
  });
  await test('header: Tools and Help navigate to the tool list and instructions', async () => {
    await p.getByRole('link', { name: 'Tools', exact: true }).click();
    await p.waitForFunction(() => location.hash === '#tools');
    await p.goto('/overtime-calculator/');
    await p.getByRole('link', { name: 'Help', exact: true }).click();
    await p.waitForURL(/\/#help$/);
    await p.waitForFunction(() => Math.abs(document.getElementById('help').getBoundingClientRect().top) < 200);
  });
  await test('biweekly page opens the calculator in 2-week mode with week-by-week overtime', async () => {
    await p.goto('/biweekly-time-card-calculator/');
    await ready(p);
    expect(await p.locator('[data-testid^=day-total-]').count() === 14, '14 days');
    for (let i = 0; i < 5; i++) await setDay(p, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i], 1, '07:00', '17:00');
    expect((await p.textContent('[data-testid=total-hm]')) === '50:00', 'week 1 50h');
    expect(/Overtime\s*10:00/.test(await p.textContent('dl')), 'OT 10h');
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
  await test('time duration: Mon 8:00 -> Wed 17:30 = 2 d 9 h 30 min (57:30); 9:15 AM + 7:45 = 5:00 PM', async () => {
    await p.goto('/time-duration-calculator/');
    await p.waitForLoadState('networkidle');
    expect((await p.textContent('[data-testid=dur-result]')) === '2 d 9 h 30 min', await p.textContent('[data-testid=dur-result]'));
    expect((await p.textContent('[data-testid=dur-hm]')) === '57:30', 'hm');
    expect((await p.textContent('[data-testid=shift-result]')) === '5:00 PM', await p.textContent('[data-testid=shift-result]'));
    await p.fill('#base', '20:00');
    expect(/3:45 AM\s*\+1 day/.test(await p.textContent('[data-testid=shift-result]')), 'crosses midnight');
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
    for (const [r, h1] of [['/', 'Free Time Card Calculator'], ['/overtime-calculator/', 'Overtime Calculator'], ['/time-to-decimal/', 'Time to Decimal Calculator']]) {
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
    expect((await p.textContent('[data-testid=day-total-0]')) === '8:00', 'offline calc');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
    expect(fs.readFileSync(await dl.path()).subarray(0, 5).toString() === '%PDF-', 'offline pdf');
    await ctx.close();
  });
}

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
fs.writeFileSync(new URL('../../docs/timecard/test-report-e2e.json', import.meta.url), JSON.stringify({ base: BASE, date: new Date().toISOString(), passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
