import { PDFDocument, PDFFont, PDFPage, PDFString, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import type { Timesheet } from './model';
import { WEEKDAYS, addDays, computePeriod, displayTime, formatDate, formatDecimal, formatHM, weekday } from './time';
import { describeRule, money } from './describe';
import { SITE_HOST, SITE_NAME, SITE_TAGLINE, SITE_URL } from '../site';

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.8, 0.84, 0.88);
const BAND = rgb(0.95, 0.96, 0.98);
const BRAND = rgb(0.11, 0.3, 0.85);
const M = 40; // page margin

type Fonts = { reg: PDFFont; bold: PDFFont };

/** Standard PDF fonts only encode WinAnsi (Latin). Replace anything else with '?'. */
function makeSafe(font: PDFFont) {
  const cache = new Map<string, boolean>();
  return (s: string) => {
    let out = '';
    for (const ch of s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')) {
      let ok = cache.get(ch);
      if (ok === undefined) {
        try { font.widthOfTextAtSize(ch, 10); ok = true; } catch { ok = false; }
        cache.set(ch, ok);
      }
      out += ok ? ch : '?';
    }
    return out;
  };
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) <= width || !line) line = test;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function fit(text: string, font: PDFFont, size: number, width: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > width) t = t.slice(0, -1);
  return t + '...';
}

function addLink(doc: PDFDocument, page: PDFPage, rect: [number, number, number, number], url: string) {
  const annot = doc.context.register(doc.context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: rect, Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
  }));
  page.node.addAnnot(annot);
}

/** Brand footer with a clickable link on every page, plus page numbers. Part of the sharing loop. */
function footers(doc: PDFDocument, f: Fonts, ref: string) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const text = `Calculated with ${SITE_NAME} - ${SITE_TAGLINE.toLowerCase()} - ${SITE_HOST}`;
    const size = 8;
    page.drawLine({ start: { x: M, y: 34 }, end: { x: width - M, y: 34 }, thickness: 0.5, color: LINE });
    page.drawText(text, { x: M, y: 22, size, font: f.reg, color: BRAND });
    const w = f.reg.widthOfTextAtSize(text, size);
    addLink(doc, page, [M, 18, M + w, 31], `${SITE_URL}/?ref=${ref}`);
    const pn = `Page ${i + 1} of ${pages.length}`;
    page.drawText(pn, { x: width - M - f.reg.widthOfTextAtSize(pn, size), y: 22, size, font: f.reg, color: MUTED });
  });
}

async function setup(paper: 'letter' | 'a4', title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator(`${SITE_NAME} (${SITE_HOST})`);
  doc.setProducer(SITE_NAME);
  const f: Fonts = { reg: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const size = paper === 'a4' ? PageSizes.A4 : PageSizes.Letter;
  return { doc, f, size: size as [number, number] };
}

const BOTTOM = 52; // keep clear of the footer

function signatureBlock(
  page: PDFPage, f: Fonts, safe: (s: string) => string, x: number, y: number, w: number, label: string,
  img?: { width: number; height: number; draw: (x: number, y: number, w: number, h: number) => void },
) {
  if (img) {
    const maxW = w * 0.75, maxH = 44;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    img.draw(x + 4, y + 4, img.width * scale, img.height * scale);
  }
  page.drawLine({ start: { x, y }, end: { x: x + w * 0.68, y }, thickness: 0.8, color: INK });
  page.drawLine({ start: { x: x + w * 0.74, y }, end: { x: x + w, y }, thickness: 0.8, color: INK });
  page.drawText(safe(label), { x, y: y - 12, size: 8, font: f.reg, color: MUTED });
  page.drawText('Date', { x: x + w * 0.74, y: y - 12, size: 8, font: f.reg, color: MUTED });
}

export type PdfOptions = { supervisorSignature?: string | null };

export async function timesheetPdf(ts: Timesheet, opts: PdfOptions = {}): Promise<Uint8Array> {
  const s = ts.settings;
  const res = computePeriod(ts.days, s.rule, s.rate, s.rounding);
  const endDate = addDays(ts.startDate, ts.days.length - 1);
  const periodText = `${formatDate(ts.startDate, 'long')} - ${formatDate(endDate, 'long')}`;
  const { doc, f, size } = await setup(s.paper, `Timesheet ${ts.employee ? '- ' + ts.employee + ' ' : ''}${ts.startDate}`);
  const safe = makeSafe(f.reg);
  const [W, Hh] = size;
  const cw = W - 2 * M;
  let page = doc.addPage(size);
  let y = Hh - M;

  // Header
  page.drawText('Timesheet', { x: M, y: y - 18, size: 22, font: f.bold, color: INK });
  const brand = safe(ts.employer || '');
  if (brand) page.drawText(fit(brand, f.bold, 12, cw * 0.5), { x: W - M - Math.min(f.bold.widthOfTextAtSize(brand, 12), cw * 0.5), y: y - 14, size: 12, font: f.bold, color: INK });
  y -= 40;
  const info: [string, string][] = [
    ['Employee', ts.employee || '-'],
    ['Company', ts.employer || '-'],
    ['Pay period', periodText],
    ['Rate', s.rate ? `${money(s.rate, s.currency)} / hour` : '-'],
  ];
  const colW = cw / 2;
  info.forEach(([k, v], i) => {
    const x = M + (i % 2) * colW;
    const yy = y - Math.floor(i / 2) * 30;
    page.drawText(k.toUpperCase(), { x, y: yy, size: 7, font: f.bold, color: MUTED });
    page.drawText(fit(safe(v), f.reg, 11, colW - 12), { x, y: yy - 13, size: 11, font: f.reg, color: INK });
  });
  y -= 70;

  // Table
  const cols = [
    { k: 'Date', w: 0.24 }, { k: 'In', w: 0.16 }, { k: 'Out', w: 0.16 }, { k: 'Break', w: 0.12 },
    { k: 'Hours', w: 0.16 }, { k: 'Decimal', w: 0.16 },
  ].map((c) => ({ ...c, w: c.w * cw }));
  const xs = cols.reduce<number[]>((a, _c, i) => [...a, i === 0 ? M : a[i - 1] + cols[i - 1].w], []);
  const header = () => {
    page.drawRectangle({ x: M, y: y - 18, width: cw, height: 18, color: INK });
    cols.forEach((c, i) => page.drawText(c.k, { x: xs[i] + 6, y: y - 12.5, size: 8.5, font: f.bold, color: rgb(1, 1, 1) }));
    y -= 18;
  };
  header();
  const lineH = 12;
  ts.days.forEach((d, i) => {
    const pairs = d.pairs.filter((p) => p.start || p.end);
    const lines = Math.max(1, pairs.length);
    const rowH = lines * lineH + 8;
    if (y - rowH < BOTTOM + 10) { page = doc.addPage(size); y = Hh - M; header(); }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rowH, width: cw, height: rowH, color: BAND });
    const ty = y - 13;
    page.drawText(`${WEEKDAYS[weekday(d.date)].slice(0, 3)}, ${formatDate(d.date)}`, { x: xs[0] + 6, y: ty, size: 9.5, font: f.reg, color: INK });
    pairs.forEach((p, k) => {
      page.drawText(displayTime(p.start, s.clock) || '-', { x: xs[1] + 6, y: ty - k * lineH, size: 9.5, font: f.reg, color: INK });
      page.drawText(displayTime(p.end, s.clock) || '-', { x: xs[2] + 6, y: ty - k * lineH, size: 9.5, font: f.reg, color: INK });
    });
    const worked = res.days[i].worked;
    if (d.breakMin) page.drawText(`${d.breakMin} min`, { x: xs[3] + 6, y: ty, size: 9.5, font: f.reg, color: INK });
    if (worked || pairs.length) {
      page.drawText(formatHM(worked), { x: xs[4] + 6, y: ty, size: 9.5, font: f.bold, color: INK });
      page.drawText(formatDecimal(worked), { x: xs[5] + 6, y: ty, size: 9.5, font: f.reg, color: INK });
    }
    // Week separator for biweekly
    if (i === 6 && ts.days.length > 7) page.drawLine({ start: { x: M, y: y - rowH }, end: { x: M + cw, y: y - rowH }, thickness: 1.2, color: INK });
    y -= rowH;
  });
  page.drawLine({ start: { x: M, y }, end: { x: M + cw, y }, thickness: 0.8, color: LINE });

  // Totals
  const totals: [string, string, string][] = [
    ['Regular', formatHM(res.total.regular), formatDecimal(res.total.regular)],
    ['Overtime', formatHM(res.total.overtime), formatDecimal(res.total.overtime)],
  ];
  if (res.total.double || s.rule.dailyDoubleHours != null) totals.push(['Double time', formatHM(res.total.double), formatDecimal(res.total.double)]);
  totals.push(['Total hours', formatHM(res.total.worked), formatDecimal(res.total.worked)]);
  const payRows: [string, string][] = res.pay ? [
    ['Regular pay', money(res.pay.regular, s.currency)],
    ...(res.pay.overtime ? [['Overtime pay', money(res.pay.overtime, s.currency)] as [string, string]] : []),
    ...(res.pay.double ? [['Double time pay', money(res.pay.double, s.currency)] as [string, string]] : []),
    ['Gross pay (estimate)', money(res.pay.total, s.currency)],
  ] : [];
  const totalsH = Math.max(totals.length, payRows.length) * 16 + 34;
  if (y - totalsH < BOTTOM + 10) { page = doc.addPage(size); y = Hh - M; }
  y -= 18;
  page.drawText(safe(describeRule(s.rule)) + (s.rounding ? ` - punches rounded to ${s.rounding} min` : ''), { x: M, y, size: 8, font: f.reg, color: MUTED });
  y -= 16;
  totals.forEach(([k, hm, dec], i) => {
    const b = i === totals.length - 1;
    const font = b ? f.bold : f.reg;
    page.drawText(k, { x: M, y: y - i * 16, size: 10, font, color: INK });
    page.drawText(hm, { x: M + 110, y: y - i * 16, size: 10, font, color: INK });
    page.drawText(`${dec} h`, { x: M + 165, y: y - i * 16, size: 10, font, color: MUTED });
  });
  payRows.forEach(([k, v], i) => {
    const b = i === payRows.length - 1;
    const font = b ? f.bold : f.reg;
    page.drawText(k, { x: M + cw / 2 + 10, y: y - i * 16, size: 10, font, color: INK });
    page.drawText(v, { x: W - M - font.widthOfTextAtSize(v, 10), y: y - i * 16, size: 10, font, color: INK });
  });
  y -= Math.max(totals.length, payRows.length) * 16 + 8;

  // Signatures + disclaimer
  const disclaimer = 'This timesheet is a record prepared by the user. Totals and pay are estimates, not payroll, tax or legal advice. '
    + 'Overtime rules differ by location and employer; check your local law and employer policy. '
    + 'A signature on this document records acknowledgement of the hours shown; it is not a certified electronic signature.';
  const dLines = wrap(disclaimer, f.reg, 7.5, cw);
  const sigH = 100 + dLines.length * 10;
  if (y - sigH < BOTTOM) { page = doc.addPage(size); y = Hh - M; }
  y -= 60;
  const sigW = cw / 2 - 16;
  const empImg = ts.signature ? await embedPng(doc, ts.signature) : undefined;
  const supImg = opts.supervisorSignature ? await embedPng(doc, opts.supervisorSignature) : undefined;
  const asDraw = (img: Awaited<ReturnType<typeof embedPng>>, p: PDFPage) => img && {
    width: img.width, height: img.height, draw: (x: number, yy: number, w: number, h: number) => p.drawImage(img, { x, y: yy, width: w, height: h }),
  };
  signatureBlock(page, f, safe, M, y, sigW, `Employee signature${ts.employee ? ' - ' + ts.employee : ''}`, asDraw(empImg, page) || undefined);
  signatureBlock(page, f, safe, M + cw / 2 + 16, y, sigW, `Supervisor signature${ts.manager ? ' - ' + ts.manager : ''}`, asDraw(supImg, page) || undefined);
  y -= 32;
  dLines.forEach((l, i) => page.drawText(l, { x: M, y: y - i * 10, size: 7.5, font: f.reg, color: MUTED }));

  footers(doc, f, 'pdf');
  return doc.save();
}

async function embedPng(doc: PDFDocument, dataUrl: string) {
  try {
    const b64 = dataUrl.split(',')[1];
    if (!dataUrl.startsWith('data:image/png') || !b64) return undefined;
    return await doc.embedPng(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  } catch {
    return undefined;
  }
}

export type BlankOptions = { period: 'weekly' | 'biweekly'; paper: 'letter' | 'a4'; weekStart: number; employer?: string; employee?: string };

/** Printable blank timesheet for people who fill in by hand. */
export async function blankTimesheetPdf(o: BlankOptions): Promise<Uint8Array> {
  const { doc, f, size } = await setup(o.paper, `Blank ${o.period} timesheet`);
  const safe = makeSafe(f.reg);
  const [W, Hh] = size;
  const cw = W - 2 * M;
  const page = doc.addPage(size);
  let y = Hh - M;
  page.drawText(o.period === 'biweekly' ? 'Biweekly Timesheet' : 'Weekly Timesheet', { x: M, y: y - 18, size: 20, font: f.bold, color: INK });
  y -= 46;
  const field = (label: string, value: string, x: number, w: number) => {
    page.drawText(label.toUpperCase(), { x, y: y + 14, size: 7, font: f.bold, color: MUTED });
    if (value) page.drawText(fit(safe(value), f.reg, 11, w), { x, y: y + 2, size: 11, font: f.reg, color: INK });
    page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.6, color: INK });
  };
  field('Employee', o.employee || '', M, cw / 2 - 12);
  field('Company', o.employer || '', M + cw / 2 + 12, cw / 2 - 12);
  y -= 36;
  field('Period from', '', M, cw / 4 - 12);
  field('To', '', M + cw / 4, cw / 4 - 12);
  field('Hourly rate', '', M + cw / 2 + 12, cw / 4 - 12);
  field('Employee ID', '', M + (3 * cw) / 4 + 12, cw / 4 - 12);
  y -= 26;

  const cols = ['Day', 'Date', 'In', 'Out', 'In', 'Out', 'Break', 'Total'];
  const ws = [0.13, 0.12, 0.12, 0.12, 0.12, 0.12, 0.11, 0.16].map((w) => w * cw);
  const xs = ws.reduce<number[]>((a, _w, i) => [...a, i === 0 ? M : a[i - 1] + ws[i - 1]], []);
  page.drawRectangle({ x: M, y: y - 18, width: cw, height: 18, color: INK });
  cols.forEach((c, i) => page.drawText(c, { x: xs[i] + 5, y: y - 12.5, size: 8.5, font: f.bold, color: rgb(1, 1, 1) }));
  y -= 18;
  const n = o.period === 'biweekly' ? 14 : 7;
  const avail = y - (BOTTOM + 170);
  const rowH = Math.min(30, Math.floor(avail / (n + 1)));
  for (let i = 0; i < n; i++) {
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rowH, width: cw, height: rowH, color: BAND });
    page.drawText(WEEKDAYS[(o.weekStart + i) % 7].slice(0, 3), { x: xs[0] + 5, y: y - rowH / 2 - 3, size: 9.5, font: f.reg, color: INK });
    xs.slice(1).forEach((x) => page.drawLine({ start: { x, y }, end: { x, y: y - rowH }, thickness: 0.4, color: LINE }));
    y -= rowH;
    page.drawLine({ start: { x: M, y }, end: { x: M + cw, y }, thickness: i === 6 && n === 14 ? 1.2 : 0.4, color: i === 6 && n === 14 ? INK : LINE });
  }
  page.drawRectangle({ x: M, y: y - rowH, width: cw, height: rowH, borderColor: INK, borderWidth: 0.8 });
  page.drawText('Total hours', { x: xs[0] + 5, y: y - rowH / 2 - 3, size: 9.5, font: f.bold, color: INK });
  y -= rowH + 22;
  const box = (label: string, x: number) => {
    page.drawText(label, { x, y, size: 9, font: f.reg, color: INK });
    page.drawLine({ start: { x: x + 78, y: y - 2 }, end: { x: x + 150, y: y - 2 }, thickness: 0.6, color: INK });
  };
  box('Regular hours', M); box('Overtime hours', M + cw / 3); box('Gross pay', M + (2 * cw) / 3);
  y -= 70;
  const sigW = cw / 2 - 16;
  signatureBlock(page, f, safe, M, y, sigW, 'Employee signature');
  signatureBlock(page, f, safe, M + cw / 2 + 16, y, sigW, 'Supervisor signature');
  y -= 30;
  wrap(`Prefer not to add it up by hand? Enter your hours at ${SITE_HOST} - totals, overtime and a filled-in PDF are calculated for you, free.`, f.reg, 8, cw)
    .forEach((l, i) => page.drawText(l, { x: M, y: y - i * 11, size: 8, font: f.reg, color: MUTED }));
  footers(doc, f, 'blank');
  return doc.save();
}
