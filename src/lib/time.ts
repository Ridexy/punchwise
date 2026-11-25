/**
 * Pure time-card arithmetic. Everything is in whole minutes.
 * Times are "HH:MM" 24-hour strings, as produced by <input type="time">.
 */

export type Pair = { start: string; end: string };
export type Day = { date: string; pairs: Pair[]; breakMin: number };

export type OvertimeRule = {
  /** Hours per workweek after which overtime applies (null = no weekly rule). */
  weeklyHours: number | null;
  /** Hours per day after which overtime applies (null = no daily rule). */
  dailyHours: number | null;
  /** Hours per day after which double time applies (null = none). */
  dailyDoubleHours: number | null;
  otMultiplier: number;
  dtMultiplier: number;
};

export type OvertimePreset = 'weekly40' | 'daily8' | 'none' | 'custom';

export const PRESETS: Record<Exclude<OvertimePreset, 'custom'>, OvertimeRule> = {
  weekly40: { weeklyHours: 40, dailyHours: null, dailyDoubleHours: null, otMultiplier: 1.5, dtMultiplier: 2 },
  daily8: { weeklyHours: 40, dailyHours: 8, dailyDoubleHours: 12, otMultiplier: 1.5, dtMultiplier: 2 },
  none: { weeklyHours: null, dailyHours: null, dailyDoubleHours: null, otMultiplier: 1.5, dtMultiplier: 2 },
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Parse "HH:MM" (24h) to minutes after midnight, or null if empty/invalid. */
export function parseTime(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = TIME_RE.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function toTimeString(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Round minutes-after-midnight to the nearest increment (0 = no rounding). Halves round up. */
export function roundTo(min: number, increment: number): number {
  if (!increment || increment <= 0) return min;
  return Math.floor(min / increment + 0.5) * increment;
}

/**
 * Minutes worked between two times. An end time at or before the start is
 * treated as the next day (overnight shift), except identical times, which count as 0.
 */
export function pairMinutes(p: Pair, rounding = 0): number | null {
  const s0 = parseTime(p.start);
  const e0 = parseTime(p.end);
  if (s0 == null || e0 == null) return null;
  const s = roundTo(s0, rounding);
  let e = roundTo(e0, rounding);
  if (e === s) return 0;
  if (e < s) e += 1440;
  return e - s;
}

export type DayResult = {
  worked: number; // minutes after breaks, >= 0
  gross: number; // minutes before breaks
  incomplete: boolean; // a pair has only one time filled
  breakExceeds: boolean;
};

export function dayMinutes(day: Day, rounding = 0): DayResult {
  let gross = 0;
  let incomplete = false;
  for (const p of day.pairs) {
    const hasS = !!p.start, hasE = !!p.end;
    if (hasS !== hasE) incomplete = true;
    const m = pairMinutes(p, rounding);
    if (m != null) gross += m;
  }
  const brk = Math.max(0, Math.round(day.breakMin || 0));
  const worked = Math.max(0, gross - brk);
  return { worked, gross, incomplete, breakExceeds: brk > gross && gross > 0 };
}

export type Split = { regular: number; overtime: number; double: number };

/**
 * Split one workweek (up to 7 day totals, in minutes, in calendar order) into
 * regular / overtime / double-time minutes.
 * Daily rules are applied first; then any regular minutes above the weekly
 * threshold become overtime.
 */
export function splitWeek(dayTotals: number[], rule: OvertimeRule): Split {
  let regular = 0, overtime = 0, double = 0;
  const D = rule.dailyHours != null ? rule.dailyHours * 60 : null;
  const DD = rule.dailyDoubleHours != null ? rule.dailyDoubleHours * 60 : null;
  for (const t of dayTotals) {
    let dt = DD != null ? Math.max(0, t - DD) : 0;
    const capped = t - dt;
    let ot = D != null ? Math.max(0, capped - D) : 0;
    // Double time without a daily OT threshold: everything above DD is double, nothing else.
    regular += capped - ot;
    overtime += ot;
    double += dt;
  }
  if (rule.weeklyHours != null) {
    const W = rule.weeklyHours * 60;
    if (regular > W) {
      overtime += regular - W;
      regular = W;
    }
  }
  return { regular, overtime, double };
}

export type PeriodResult = {
  days: DayResult[];
  weeks: Split[];
  total: Split & { worked: number };
  pay: { regular: number; overtime: number; double: number; total: number } | null;
  warnings: string[];
};

/** Days are split into workweeks of 7 in order (biweekly = 2 weeks). */
export function computePeriod(days: Day[], rule: OvertimeRule, rate: number | null, rounding = 0): PeriodResult {
  const dayRes = days.map((d) => dayMinutes(d, rounding));
  const weeks: Split[] = [];
  for (let i = 0; i < dayRes.length; i += 7) {
    weeks.push(splitWeek(dayRes.slice(i, i + 7).map((d) => d.worked), rule));
  }
  const total = weeks.reduce<Split & { worked: number }>(
    (a, w) => ({ regular: a.regular + w.regular, overtime: a.overtime + w.overtime, double: a.double + w.double, worked: a.worked + w.regular + w.overtime + w.double }),
    { regular: 0, overtime: 0, double: 0, worked: 0 },
  );
  let pay: PeriodResult['pay'] = null;
  if (rate != null && isFinite(rate) && rate > 0) {
    const r = round2((total.regular / 60) * rate);
    const o = round2((total.overtime / 60) * rate * rule.otMultiplier);
    const d = round2((total.double / 60) * rate * rule.dtMultiplier);
    pay = { regular: r, overtime: o, double: d, total: round2(r + o + d) };
  }
  const warnings: string[] = [];
  days.forEach((d, i) => {
    if (dayRes[i].incomplete) warnings.push(`${d.date}: a shift has only one time filled in`);
    if (dayRes[i].breakExceeds) warnings.push(`${d.date}: break is longer than time worked`);
  });
  return { days: dayRes, weeks, total, pay, warnings };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** 495 -> "8:15" */
export function formatHM(min: number): string {
  const sign = min < 0 ? '-' : '';
  const m = Math.abs(Math.round(min));
  return `${sign}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** 495 -> "8.25" */
export function formatDecimal(min: number, places = 2): string {
  return (min / 60).toFixed(places);
}

/** Display a "HH:MM" string in 12h or 24h style. */
export function displayTime(s: string, clock: 12 | 24): string {
  const m = parseTime(s);
  if (m == null) return '';
  if (clock === 24) return toTimeString(m);
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** 24h "HH:MM" -> military "HHMM" */
export function toMilitary(s: string): string | null {
  const m = parseTime(s);
  return m == null ? null : toTimeString(m).replace(':', '');
}

/** Accepts "0730", "730", "07:30", "7:30" (24h) -> minutes, or null. */
export function parseMilitary(s: string): number | null {
  const t = s.trim().replace(':', '');
  if (!/^\d{3,4}$/.test(t)) return null;
  const h = Number(t.slice(0, -2)), m = Number(t.slice(-2));
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Accepts "7:30 PM", "7pm", "12:05am", "7:30" (assumed as typed, 24h if no suffix). */
export function parse12h(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  const m = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (mm > 59) return null;
  const suf = m[3];
  if (suf) {
    if (h < 1 || h > 12) return null;
    const pm = suf.startsWith('p');
    if (h === 12) h = 0;
    if (pm) h += 12;
  } else if (h > 23) return null;
  return h * 60 + mm;
}

/** Decimal hours <-> minutes */
export function decimalToMinutes(dec: number): number {
  return Math.round(dec * 60);
}

/** Parse "7:45", "7h 45m", "7.75", "45" (minutes if minutesOnly) to minutes. */
export function parseDuration(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d+):([0-5]?\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/.exec(t);
  if (m && (m[1] || m[2])) return Math.round(Number(m[1] || 0) * 60) + Number(m[2] || 0);
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 60);
  return null;
}

/** ISO date helpers (local calendar dates, no time zone drift). */
export function addDays(iso: string, n: number): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function weekday(iso: string): number {
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}
/** Most recent date on or before `iso` that falls on `weekStart` (0=Sun). */
export function startOfWeek(iso: string, weekStart: number): string {
  const diff = (weekday(iso) - weekStart + 7) % 7;
  return addDays(iso, -diff);
}
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function formatDate(iso: string, style: 'short' | 'long' = 'short'): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.toLocaleDateString('en-US', style === 'short'
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
