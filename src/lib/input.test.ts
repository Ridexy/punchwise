import { describe, expect, it } from 'vitest';
import { PRESETS, computePeriod, flipMeridiem, guessMeridiem, parseTimeInput } from './time';
import { DEFAULT_SETTINGS, computeSheet, createTimesheet, redact } from './model';
import { decodeTimesheet, encodeTimesheet } from './share';

describe('parseTimeInput (what people type)', () => {
  const v = (raw: string, clock: 12 | 24 = 12, prefer: 'am' | 'pm' = 'am') => parseTimeInput(raw, clock, prefer);
  it('am/pm suffixes are unambiguous', () => {
    expect(v('5p')).toEqual({ value: '17:00', ambiguous: false });
    expect(v('5pm')).toEqual({ value: '17:00', ambiguous: false });
    expect(v('5:30 PM')).toEqual({ value: '17:30', ambiguous: false });
    expect(v('12a')).toEqual({ value: '00:00', ambiguous: false });
    expect(v('12pm')).toEqual({ value: '12:00', ambiguous: false });
    expect(v('930a')).toEqual({ value: '09:30', ambiguous: false });
  });
  it('24-hour style values are unambiguous', () => {
    expect(v('1730')).toEqual({ value: '17:30', ambiguous: false });
    expect(v('17:30')).toEqual({ value: '17:30', ambiguous: false });
    expect(v('0730')).toEqual({ value: '07:30', ambiguous: false });
    expect(v('00:15')).toEqual({ value: '00:15', ambiguous: false });
    expect(v('9.30', 24)).toEqual({ value: '09:30', ambiguous: false });
  });
  it('bare 1-12 hours in 12-hour mode are flagged ambiguous and use the preference', () => {
    expect(v('9')).toEqual({ value: '09:00', ambiguous: true });
    expect(v('9', 12, 'pm')).toEqual({ value: '21:00', ambiguous: true });
    expect(v('930')).toEqual({ value: '09:30', ambiguous: true });
    expect(v('9:30', 12, 'pm')).toEqual({ value: '21:30', ambiguous: true });
    expect(v('12')).toEqual({ value: '00:00', ambiguous: true });
    expect(v('12', 12, 'pm')).toEqual({ value: '12:00', ambiguous: true });
  });
  it('rejects invalid input instead of guessing', () => {
    for (const s of ['', '25', '13p', '0p', '9:75', '12345', 'abc', '9::30', '-1']) expect(v(s)).toBeNull();
  });
});

describe('guessMeridiem', () => {
  it('uses the other end of the shift', () => {
    expect(guessMeridiem('5', 'out', '09:00')).toBe('pm'); // 9am-5pm, not 20h
    expect(guessMeridiem('6', 'out', '22:00')).toBe('am'); // night shift
    expect(guessMeridiem('10', 'in', '18:30')).toBe('am'); // 10am-6:30pm
    expect(guessMeridiem('10', 'in', '06:00')).toBe('pm'); // 10pm-6am
  });
  it('falls back to sensible defaults', () => {
    expect(guessMeridiem('8', 'in', '')).toBe('am');
    expect(guessMeridiem('2', 'in', '')).toBe('pm');
    expect(guessMeridiem('5', 'out', '')).toBe('pm');
  });
  it('flipMeridiem swaps halves of the day', () => {
    expect(flipMeridiem('09:15')).toBe('21:15');
    expect(flipMeridiem('21:15')).toBe('09:15');
    expect(flipMeridiem('00:00')).toBe('12:00');
  });
});

describe('separate overtime rate and break totals', () => {
  const days = Array.from({ length: 5 }, (_, i) => ({ date: `2026-11-2${3 + i}`, breakMin: 30, pairs: [{ start: '08:00', end: '17:30' }] }));
  it('otRate overrides rate x multiplier', () => {
    // 9h/day x5 = 45h -> 40 reg + 5 OT
    expect(computePeriod(days, PRESETS.weekly40, 20, 0).pay?.overtime).toBe(150);
    expect(computePeriod(days, PRESETS.weekly40, 20, 0, 35).pay).toEqual({ regular: 800, overtime: 175, double: 0, total: 975 });
  });
  it('total break time only counts breaks actually deducted', () => {
    const withEmpty = [...days, { date: '2026-11-28', breakMin: 60, pairs: [{ start: '', end: '' }] }];
    expect(computePeriod(withEmpty, PRESETS.weekly40, null).total.breaks).toBe(150);
  });
  it('computeSheet uses the sheet settings', () => {
    const ts = createTimesheet({ ...DEFAULT_SETTINGS, rate: 20, otRate: 35 }, '2026-11-25');
    ts.days.slice(0, 5).forEach((d) => { d.pairs = [{ start: '08:00', end: '17:00' }]; });
    expect(computeSheet(ts).pay?.total).toBe(975);
  });
  it('default week starts on Monday', () => {
    expect(createTimesheet(DEFAULT_SETTINGS, '2026-11-25').startDate).toBe('2026-11-23');
  });
});

describe('privacy: redact before sharing', () => {
  const ts = createTimesheet({ ...DEFAULT_SETTINGS, rate: 22, otRate: 40 }, '2026-11-25');
  ts.employee = 'Ana'; ts.employer = 'Acme'; ts.manager = 'Sam'; ts.signature = 'data:image/png;base64,AA';
  ts.days[0].pairs = [{ start: '09:00', end: '17:00' }];
  it('defaults strip name, company, pay and signature but keep hours and recipient', () => {
    const back = decodeTimesheet(encodeTimesheet(redact(ts, { identity: false, pay: false })))!;
    expect(back.employee).toBe('');
    expect(back.employer).toBe('');
    expect(back.settings.rate).toBeNull();
    expect(back.settings.otRate).toBeNull();
    expect(back.manager).toBe('Sam');
    expect(back.days[0].pairs[0]).toEqual({ start: '09:00', end: '17:00' });
    expect(redact(ts, { identity: false, pay: false }).signature).toBeNull();
  });
  it('opt-in fields travel when chosen', () => {
    const back = decodeTimesheet(encodeTimesheet(redact(ts, { identity: true, pay: true })))!;
    expect(back.employee).toBe('Ana');
    expect(back.settings.rate).toBe(22);
    expect(back.settings.otRate).toBe(40);
  });
});

import { classify, withRef } from './track';
describe('attribution', () => {
  it('classifies arrivals', () => {
    expect(classify('/', '?ref=invite', '', 'punchwise.com')).toBe('coworker_invitation');
    expect(classify('/', '?ref=embed', 'https://blog.example.com/', 'punchwise.com')).toBe('embedded_calculator');
    expect(classify('/', '?ref=card', '', 'punchwise.com')).toBe('shared_result');
    expect(classify('/view/', '', '', 'punchwise.com')).toBe('shared_result');
    expect(classify('/', '', 'https://www.google.com/', 'punchwise.com')).toBe('organic_search');
    expect(classify('/', '', 'https://duckduckgo.com/', 'punchwise.com')).toBe('organic_search');
    expect(classify('/', '', '', 'punchwise.com')).toBe('direct');
    expect(classify('/', '', 'https://punchwise.com/overtime-calculator/', 'punchwise.com')).toBe('direct');
    expect(classify('/', '', 'https://reddit.com/r/x', 'punchwise.com')).toBe('other_referral');
  });
  it('withRef keeps the fragment after the query', () => {
    expect(withRef('https://x.app/view/#d=abc', 'share')).toBe('https://x.app/view/?ref=share#d=abc');
    expect(withRef('https://x.app/', 'invite')).toBe('https://x.app/?ref=invite');
    expect(withRef('https://x.app/?a=1', 'pdf')).toBe('https://x.app/?a=1&ref=pdf');
  });
});
