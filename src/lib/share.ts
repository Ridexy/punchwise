import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { DEFAULT_SETTINGS, buildDays, newId, periodLength, type Settings, type Timesheet } from './model';
import { PRESETS, parseTime, type OvertimePreset } from './time';

/**
 * Share links keep all data in the URL fragment (#...), which browsers never
 * send to the server. Payloads are compact JSON, lz-string compressed, versioned.
 */
const V = 1;

type CompactSettings = [
  period: 0 | 1, weekStart: number, clock: 12 | 24, rounding: number, rate: number | null, currency: string,
  preset: OvertimePreset, weekly: number | null, daily: number | null, dbl: number | null, ot: number, dt: number, paper: 0 | 1,
];

function packSettings(s: Settings): CompactSettings {
  return [s.period === 'biweekly' ? 1 : 0, s.weekStart, s.clock, s.rounding, s.rate, s.currency, s.preset,
    s.rule.weeklyHours, s.rule.dailyHours, s.rule.dailyDoubleHours, s.rule.otMultiplier, s.rule.dtMultiplier, s.paper === 'a4' ? 1 : 0];
}

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

function unpackSettings(c: unknown): Settings {
  if (!Array.isArray(c)) return { ...DEFAULT_SETTINGS, rule: { ...DEFAULT_SETTINGS.rule } };
  const preset = (['weekly40', 'daily8', 'none', 'custom'] as const).includes(c[6]) ? (c[6] as OvertimePreset) : 'weekly40';
  const base = preset === 'custom' ? PRESETS.weekly40 : PRESETS[preset];
  const rounding = [0, 5, 6, 10, 15].includes(c[3]) ? c[3] : 0;
  return {
    period: c[0] === 1 ? 'biweekly' : 'weekly',
    weekStart: num(c[1], 0, 6) ?? 0,
    clock: c[2] === 24 ? 24 : 12,
    rounding,
    rate: num(c[4], 0, 100000),
    currency: str(c[5], 4) || '$',
    preset,
    rule: preset === 'custom'
      ? { weeklyHours: num(c[7], 0, 168), dailyHours: num(c[8], 0, 24), dailyDoubleHours: num(c[9], 0, 24), otMultiplier: num(c[10], 1, 10) ?? 1.5, dtMultiplier: num(c[11], 1, 10) ?? 2 }
      : { ...base },
    paper: c[12] === 1 ? 'a4' : 'letter',
  };
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const validTime = (t: unknown): string => (typeof t === 'string' && parseTime(t) != null ? t : '');

/** Timesheet -> fragment payload (no id, no signature). */
export function encodeTimesheet(ts: Timesheet): string {
  const data = {
    v: V,
    e: ts.employee, r: ts.employer, m: ts.manager, d: ts.startDate,
    s: packSettings(ts.settings),
    // per day: [breakMin, start1, end1, start2, end2, ...]
    t: ts.days.map((d) => [d.breakMin, ...d.pairs.flatMap((p) => [p.start, p.end])]),
  };
  return compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeTimesheet(payload: string): Timesheet | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const o = JSON.parse(json);
    if (!o || o.v !== V || typeof o.d !== 'string' || !ISO_RE.test(o.d) || !Array.isArray(o.t)) return null;
    const settings = unpackSettings(o.s);
    const days = buildDays(o.d, periodLength(settings)).map((day, i) => {
      const row = Array.isArray(o.t[i]) ? o.t[i] : [];
      const pairs = [];
      for (let k = 1; k < row.length && pairs.length < 6; k += 2) pairs.push({ start: validTime(row[k]), end: validTime(row[k + 1]) });
      return { date: day.date, breakMin: num(row[0], 0, 1440) ?? 0, pairs: pairs.length ? pairs : [{ start: '', end: '' }] };
    });
    return {
      id: newId(), employee: str(o.e, 80), employer: str(o.r, 80), manager: str(o.m, 80),
      startDate: o.d, days, settings, signature: null, updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export type TeamSetup = { employer: string; manager: string; settings: Settings };

export function encodeSetup(t: TeamSetup): string {
  return compressToEncodedURIComponent(JSON.stringify({ v: V, r: t.employer, m: t.manager, s: packSettings(t.settings) }));
}

export function decodeSetup(payload: string): TeamSetup | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const o = JSON.parse(json);
    if (!o || o.v !== V) return null;
    return { employer: str(o.r, 80), manager: str(o.m, 80), settings: unpackSettings(o.s) };
  } catch {
    return null;
  }
}

/** Generic small state for tool pages: plain key/values in the fragment. */
export function encodeParams(p: Record<string, string>): string {
  return new URLSearchParams(Object.entries(p).filter(([, v]) => v !== '')).toString();
}
export function decodeParams(hash: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(hash.replace(/^#/, '')));
}

/** Read "#key=value" from a hash string. */
export function hashValue(hash: string, key: string): string | null {
  const h = hash.replace(/^#/, '');
  const prefix = key + '=';
  return h.startsWith(prefix) ? h.slice(prefix.length) : null;
}
