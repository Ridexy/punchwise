import { addDays, startOfWeek, todayISO, PRESETS, type Day, type OvertimePreset, type OvertimeRule } from './time';

export type Settings = {
  period: 'weekly' | 'biweekly';
  weekStart: number; // 0 = Sunday
  clock: 12 | 24;
  rounding: 0 | 5 | 6 | 10 | 15;
  rate: number | null;
  currency: string; // symbol shown before amounts
  preset: OvertimePreset;
  rule: OvertimeRule;
  paper: 'letter' | 'a4';
};

export type Timesheet = {
  id: string;
  employee: string;
  employer: string;
  manager: string; // who the sheet gets sent to (from a team link)
  startDate: string; // ISO, first day of period
  days: Day[];
  settings: Settings;
  signature: string | null; // PNG data URL (never put into share links)
  updatedAt: number;
};

export const DEFAULT_SETTINGS: Settings = {
  period: 'weekly',
  weekStart: 0,
  clock: 12,
  rounding: 0,
  rate: null,
  currency: '$',
  preset: 'weekly40',
  rule: { ...PRESETS.weekly40 },
  paper: 'letter',
};

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function periodLength(s: Settings): number {
  return s.period === 'biweekly' ? 14 : 7;
}

export function buildDays(startDate: string, length: number, previous: Day[] = []): Day[] {
  return Array.from({ length }, (_, i) => {
    const date = addDays(startDate, i);
    const old = previous.find((d) => d.date === date);
    return old ?? { date, pairs: [{ start: '', end: '' }], breakMin: 0 };
  });
}

export function createTimesheet(settings: Settings = DEFAULT_SETTINGS, today = todayISO()): Timesheet {
  const startDate = startOfWeek(today, settings.weekStart);
  return {
    id: newId(),
    employee: '',
    employer: '',
    manager: '',
    startDate,
    days: buildDays(startDate, periodLength(settings)),
    settings: { ...settings, rule: { ...settings.rule } },
    signature: null,
    updatedAt: Date.now(),
  };
}

/** Re-align days after the start date or period length changes, keeping entered data by date. */
export function realign(ts: Timesheet, patch: Partial<Pick<Timesheet, 'startDate'>> & { settings?: Settings }): Timesheet {
  const settings = patch.settings ?? ts.settings;
  let startDate = patch.startDate ?? ts.startDate;
  if (patch.settings && patch.settings.weekStart !== ts.settings.weekStart) {
    startDate = startOfWeek(startDate, settings.weekStart);
  }
  return { ...ts, settings, startDate, days: buildDays(startDate, periodLength(settings), ts.days), updatedAt: Date.now() };
}

/** Copy of a sheet for the next period, same shifts on the same weekdays. */
export function nextPeriodCopy(ts: Timesheet): Timesheet {
  const len = periodLength(ts.settings);
  const startDate = addDays(ts.startDate, len);
  return {
    ...ts,
    id: newId(),
    startDate,
    days: ts.days.map((d, i) => ({ date: addDays(startDate, i), pairs: d.pairs.map((p) => ({ ...p })), breakMin: d.breakMin })),
    signature: null,
    updatedAt: Date.now(),
  };
}

export function hasAnyTime(ts: Timesheet): boolean {
  return ts.days.some((d) => d.pairs.some((p) => p.start || p.end));
}
