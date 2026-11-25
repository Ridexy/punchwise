import { computeSheet, type Timesheet } from './model';
import { WEEKDAYS, displayTime, formatDecimal, formatHM, weekday } from './time';

const cell = (v: string | number) => {
  const s = String(v);
  // Quote, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function timesheetCsv(ts: Timesheet): string {
  const res = computeSheet(ts);
  const maxPairs = Math.max(1, ...ts.days.map((d) => d.pairs.length));
  const head = ['Date', 'Day'];
  for (let i = 1; i <= maxPairs; i++) head.push(`In ${i}`, `Out ${i}`);
  head.push('Break (min)', 'Hours (h:mm)', 'Hours (decimal)');
  const rows = [head];
  ts.days.forEach((d, i) => {
    const r: (string | number)[] = [d.date, WEEKDAYS[weekday(d.date)]];
    for (let k = 0; k < maxPairs; k++) {
      const p = d.pairs[k];
      r.push(p ? displayTime(p.start, ts.settings.clock) : '', p ? displayTime(p.end, ts.settings.clock) : '');
    }
    r.push(d.breakMin, formatHM(res.days[i].worked), formatDecimal(res.days[i].worked));
    rows.push(r.map(String));
  });
  const blank = Array(head.length - 2).fill('');
  rows.push([]);
  rows.push(['Regular', ...blank, formatHM(res.total.regular), formatDecimal(res.total.regular)]);
  rows.push(['Overtime', ...blank, formatHM(res.total.overtime), formatDecimal(res.total.overtime)]);
  if (res.total.double) rows.push(['Double time', ...blank, formatHM(res.total.double), formatDecimal(res.total.double)]);
  rows.push(['Total', ...blank, formatHM(res.total.worked), formatDecimal(res.total.worked)]);
  if (res.pay) rows.push(['Gross pay (estimate)', ...blank, '', res.pay.total.toFixed(2)]);
  if (ts.employee) rows.unshift(['Employee', ts.employee]);
  if (ts.employer) rows.unshift(['Company', ts.employer]);
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
