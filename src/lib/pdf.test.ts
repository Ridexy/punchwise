import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { blankTimesheetPdf, timesheetPdf } from './pdf';
import { createTimesheet, DEFAULT_SETTINGS } from './model';
import { timesheetCsv } from './csv';

function filled(period: 'weekly' | 'biweekly', pairsPerDay = 1) {
  const ts = createTimesheet({ ...DEFAULT_SETTINGS, period, rate: 18 }, '2026-11-25');
  ts.employee = 'José Núñez 李'; // non-Latin chars must not crash
  ts.employer = 'A very long company name that goes on and on Incorporated Holdings International';
  ts.days.forEach((d) => {
    d.pairs = Array.from({ length: pairsPerDay }, (_, k) => ({ start: `${String(6 + k * 3).padStart(2, '0')}:00`, end: `${String(8 + k * 3).padStart(2, '0')}:30` }));
    d.breakMin = 15;
  });
  return ts;
}

describe('timesheetPdf', () => {
  it('weekly letter: one page, valid PDF', async () => {
    const bytes = await timesheetPdf(filled('weekly'));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  });
  it('biweekly with many shifts per day paginates instead of overflowing', async () => {
    const ts = filled('biweekly', 6);
    ts.settings.paper = 'a4';
    const doc = await PDFDocument.load(await timesheetPdf(ts));
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(Math.round(doc.getPage(0).getSize().width)).toBe(595);
  });
  it('empty sheet still renders', async () => {
    const doc = await PDFDocument.load(await timesheetPdf(createTimesheet()));
    expect(doc.getPageCount()).toBe(1);
  });
  it('embeds drawn signatures', async () => {
    // 1x1 transparent PNG
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const ts = filled('weekly');
    ts.signature = png;
    const bytes = await timesheetPdf(ts, { supervisorSignature: png });
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe('blankTimesheetPdf', () => {
  it('weekly and biweekly fit on one page', async () => {
    for (const period of ['weekly', 'biweekly'] as const) {
      for (const paper of ['letter', 'a4'] as const) {
        const doc = await PDFDocument.load(await blankTimesheetPdf({ period, paper, weekStart: 1, employer: 'Acme' }));
        expect(doc.getPageCount()).toBe(1);
      }
    }
  });
});

describe('timesheetCsv', () => {
  it('has a header, a row per day and totals; neutralises formulas', () => {
    const ts = filled('weekly', 2);
    ts.employee = '=HYPERLINK("x")';
    const csv = timesheetCsv(ts);
    expect(csv.trim().split('\r\n')[1]).toContain("'=HYPERLINK");
    expect(csv).toContain('In 2');
    expect(csv).toMatch(/Total,.*\d+:\d{2},\d+\.\d{2}/);
    expect(csv).toContain('Gross pay (estimate)');
  });
});
