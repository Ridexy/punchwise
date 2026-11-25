import { describe, expect, it } from 'vitest';
import { createTimesheet, DEFAULT_SETTINGS } from './model';
import { decodeSetup, decodeTimesheet, encodeSetup, encodeTimesheet, hashValue } from './share';
import { PRESETS } from './time';

describe('timesheet share links', () => {
  it('round-trips a filled biweekly sheet', () => {
    const settings = { ...DEFAULT_SETTINGS, period: 'biweekly' as const, rate: 22.5, preset: 'daily8' as const, rule: { ...PRESETS.daily8 }, clock: 24 as const };
    const ts = createTimesheet(settings, '2026-11-25');
    ts.employee = 'Ana Lima';
    ts.employer = 'Acme Café';
    ts.manager = 'Sam';
    ts.days[1].pairs = [{ start: '08:00', end: '12:00' }, { start: '12:30', end: '17:00' }];
    ts.days[1].breakMin = 15;
    ts.days[13].pairs = [{ start: '22:00', end: '06:00' }];
    ts.signature = 'data:image/png;base64,AAAA';
    const payload = encodeTimesheet(ts);
    expect(payload).not.toMatch(/[#?&\s]/);
    const back = decodeTimesheet(payload)!;
    expect(back.employee).toBe('Ana Lima');
    expect(back.employer).toBe('Acme Café');
    expect(back.manager).toBe('Sam');
    expect(back.startDate).toBe(ts.startDate);
    expect(back.days).toEqual(ts.days);
    expect(back.settings).toEqual(ts.settings);
    expect(back.signature).toBeNull(); // signatures never travel in links
  });
  it('keeps links short enough for chat apps', () => {
    const ts = createTimesheet({ ...DEFAULT_SETTINGS, period: 'biweekly' }, '2026-11-25');
    ts.days.forEach((d) => (d.pairs = [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }]));
    expect(encodeTimesheet(ts).length).toBeLessThan(1000);
  });
  it('rejects garbage and sanitises hostile values', () => {
    expect(decodeTimesheet('not-a-payload')).toBeNull();
    expect(decodeTimesheet('')).toBeNull();
  });
  it('custom overtime rule survives', () => {
    const ts = createTimesheet({ ...DEFAULT_SETTINGS, preset: 'custom', rule: { weeklyHours: 37.5, dailyHours: null, dailyDoubleHours: null, otMultiplier: 1.5, dtMultiplier: 2 } });
    expect(decodeTimesheet(encodeTimesheet(ts))!.settings.rule.weeklyHours).toBe(37.5);
  });
});

describe('team setup links', () => {
  it('round-trips', () => {
    const setup = { employer: 'Acme', manager: 'Sam Lee', settings: { ...DEFAULT_SETTINGS, weekStart: 1, rounding: 15 as const } };
    expect(decodeSetup(encodeSetup(setup))).toEqual(setup);
  });
});

describe('hashValue', () => {
  it('reads a keyed fragment', () => {
    expect(hashValue('#d=abc', 'd')).toBe('abc');
    expect(hashValue('#setup=x', 'd')).toBeNull();
  });
});
