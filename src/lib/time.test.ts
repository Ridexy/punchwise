import { describe, expect, it } from 'vitest';
import {
  PRESETS, addDays, computePeriod, dayMinutes, displayTime, formatDecimal, formatHM, pairMinutes, parse12h,
  parseDuration, parseMilitary, parseTime, roundTo, splitWeek, startOfWeek, toMilitary, weekday, type Day,
} from './time';

const day = (pairs: [string, string][], breakMin = 0, date = '2026-11-23'): Day => ({ date, breakMin, pairs: pairs.map(([start, end]) => ({ start, end })) });
const H = 60;

describe('parseTime', () => {
  it('parses valid 24h times', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('09:05')).toBe(545);
    expect(parseTime('23:59')).toBe(1439);
    expect(parseTime('7:30')).toBe(450);
  });
  it('rejects empty and invalid', () => {
    for (const s of ['', '24:00', '12:60', 'abc', '1230', null, undefined]) expect(parseTime(s as string)).toBeNull();
  });
});

describe('pairMinutes', () => {
  it('normal shift', () => expect(pairMinutes({ start: '09:00', end: '17:30' })).toBe(8.5 * H));
  it('overnight shift crosses midnight', () => expect(pairMinutes({ start: '22:00', end: '06:00' })).toBe(8 * H));
  it('ends exactly at midnight', () => expect(pairMinutes({ start: '16:00', end: '00:00' })).toBe(8 * H));
  it('identical times count 0', () => expect(pairMinutes({ start: '09:00', end: '09:00' })).toBe(0));
  it('incomplete pair is null', () => expect(pairMinutes({ start: '09:00', end: '' })).toBeNull());
  it('applies rounding to each punch', () => {
    // 08:53 -> 09:00, 17:07 -> 17:00 with 15-min rounding
    expect(pairMinutes({ start: '08:53', end: '17:07' }, 15)).toBe(8 * H);
    // 08:52 -> 08:45 (7 min past 8:45 rounds down), 17:08 -> 17:15
    expect(pairMinutes({ start: '08:52', end: '17:08' }, 15)).toBe(8.5 * H);
  });
});

describe('roundTo', () => {
  it('rounds to nearest increment, halves up', () => {
    expect(roundTo(7, 15)).toBe(0);
    expect(roundTo(8, 15)).toBe(15);
    expect(roundTo(3, 6)).toBe(6);
    expect(roundTo(2, 6)).toBe(0);
    expect(roundTo(123, 0)).toBe(123);
  });
});

describe('dayMinutes', () => {
  it('split shift with break', () => {
    const r = dayMinutes(day([['08:00', '12:00'], ['13:00', '17:30']], 15));
    expect(r.worked).toBe(8 * H + 15);
    expect(r.gross).toBe(8.5 * H);
    expect(r.incomplete).toBe(false);
  });
  it('never negative when break exceeds work', () => {
    const r = dayMinutes(day([['09:00', '09:30']], 60));
    expect(r.worked).toBe(0);
    expect(r.breakExceeds).toBe(true);
  });
  it('flags incomplete pair', () => expect(dayMinutes(day([['09:00', '']])).incomplete).toBe(true));
  it('empty day is zero and not flagged', () => {
    const r = dayMinutes(day([['', '']]));
    expect(r).toEqual({ worked: 0, gross: 0, incomplete: false, breakExceeds: false });
  });
});

describe('splitWeek', () => {
  it('weekly 40: 5 x 9h = 40 reg + 5 OT', () => {
    expect(splitWeek([9, 9, 9, 9, 9].map((h) => h * H), PRESETS.weekly40)).toEqual({ regular: 40 * H, overtime: 5 * H, double: 0 });
  });
  it('weekly 40: under 40 has no OT', () => {
    expect(splitWeek([8, 8, 8, 8].map((h) => h * H), PRESETS.weekly40)).toEqual({ regular: 32 * H, overtime: 0, double: 0 });
  });
  it('daily 8 / double 12: a single 14h day', () => {
    expect(splitWeek([14 * H], PRESETS.daily8)).toEqual({ regular: 8 * H, overtime: 4 * H, double: 2 * H });
  });
  it('daily + weekly combined does not double count', () => {
    // 6 days x 9h: daily OT 6h; regular 48h -> weekly caps to 40, +8 OT => OT 14
    expect(splitWeek(Array(6).fill(9 * H), PRESETS.daily8)).toEqual({ regular: 40 * H, overtime: 14 * H, double: 0 });
  });
  it('none: everything regular', () => {
    expect(splitWeek([12 * H, 12 * H, 12 * H, 12 * H], PRESETS.none)).toEqual({ regular: 48 * H, overtime: 0, double: 0 });
  });
  it('custom threshold 37.5h', () => {
    const rule = { ...PRESETS.weekly40, weeklyHours: 37.5 };
    expect(splitWeek(Array(5).fill(8 * H), rule)).toEqual({ regular: 37.5 * H, overtime: 2.5 * H, double: 0 });
  });
});

describe('computePeriod', () => {
  it('biweekly applies the weekly threshold per week, not per period', () => {
    const days: Day[] = [];
    for (let i = 0; i < 14; i++) {
      const hrs = i < 7 ? (i < 5 ? 10 : 0) : (i < 12 ? 6 : 0); // wk1 50h, wk2 30h
      days.push(day(hrs ? [['08:00', `${String(8 + hrs).padStart(2, '0')}:00`]] : [['', '']], 0, addDays('2026-11-22', i)));
    }
    const r = computePeriod(days, PRESETS.weekly40, 20);
    expect(r.weeks[0]).toEqual({ regular: 40 * H, overtime: 10 * H, double: 0 });
    expect(r.weeks[1]).toEqual({ regular: 30 * H, overtime: 0, double: 0 });
    expect(r.total.worked).toBe(80 * H);
    // 70h x 20 + 10h x 30 = 1400 + 300
    expect(r.pay).toEqual({ regular: 1400, overtime: 300, double: 0, total: 1700 });
  });
  it('no pay without a rate', () => {
    expect(computePeriod([day([['09:00', '17:00']])], PRESETS.weekly40, null).pay).toBeNull();
  });
  it('pay rounds to cents', () => {
    const r = computePeriod([day([['09:00', '09:20']])], PRESETS.weekly40, 15.55);
    expect(r.pay?.total).toBe(5.18);
  });
  it('collects warnings', () => {
    const r = computePeriod([day([['09:00', '']]), day([['09:00', '09:10']], 30, '2026-11-24')], PRESETS.weekly40, null);
    expect(r.warnings).toHaveLength(2);
  });
});

describe('formatting', () => {
  it('formatHM / formatDecimal', () => {
    expect(formatHM(495)).toBe('8:15');
    expect(formatHM(5)).toBe('0:05');
    expect(formatDecimal(495)).toBe('8.25');
    expect(formatDecimal(20)).toBe('0.33');
  });
  it('displayTime', () => {
    expect(displayTime('00:15', 12)).toBe('12:15 AM');
    expect(displayTime('12:00', 12)).toBe('12:00 PM');
    expect(displayTime('17:45', 12)).toBe('5:45 PM');
    expect(displayTime('17:45', 24)).toBe('17:45');
    expect(displayTime('', 12)).toBe('');
  });
});

describe('military and 12h parsing', () => {
  it('toMilitary / parseMilitary', () => {
    expect(toMilitary('07:05')).toBe('0705');
    expect(toMilitary('23:59')).toBe('2359');
    expect(parseMilitary('1830')).toBe(18 * H + 30);
    expect(parseMilitary('730')).toBe(7 * H + 30);
    expect(parseMilitary('2400')).toBeNull();
    expect(parseMilitary('12a')).toBeNull();
  });
  it('parse12h', () => {
    expect(parse12h('7:30 PM')).toBe(19 * H + 30);
    expect(parse12h('12:05am')).toBe(5);
    expect(parse12h('12pm')).toBe(12 * H);
    expect(parse12h('7p')).toBe(19 * H);
    expect(parse12h('13:00')).toBe(13 * H);
    expect(parse12h('13pm')).toBeNull();
    expect(parse12h('nope')).toBeNull();
  });
});

describe('parseDuration', () => {
  it('accepts several formats', () => {
    expect(parseDuration('7:45')).toBe(465);
    expect(parseDuration('7h 45m')).toBe(465);
    expect(parseDuration('7.75')).toBe(465);
    expect(parseDuration('45m')).toBe(45);
    expect(parseDuration('2h')).toBe(120);
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });
});

describe('dates', () => {
  it('weekday / startOfWeek / addDays across month and year', () => {
    expect(weekday('2026-11-25')).toBe(3); // Wednesday
    expect(startOfWeek('2026-11-25', 0)).toBe('2026-11-22');
    expect(startOfWeek('2026-11-25', 1)).toBe('2026-11-23');
    expect(startOfWeek('2026-11-22', 0)).toBe('2026-11-22');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});
