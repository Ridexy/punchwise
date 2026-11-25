import type { OvertimeRule } from './time';

const n = (x: number) => (Number.isInteger(x) ? String(x) : String(x));

export function describeRule(rule: OvertimeRule): string {
  const parts: string[] = [];
  if (rule.dailyHours != null) parts.push(`over ${n(rule.dailyHours)} h/day at ${n(rule.otMultiplier)}x`);
  if (rule.dailyDoubleHours != null) parts.push(`over ${n(rule.dailyDoubleHours)} h/day at ${n(rule.dtMultiplier)}x`);
  if (rule.weeklyHours != null) parts.push(`over ${n(rule.weeklyHours)} h/week at ${n(rule.otMultiplier)}x`);
  return parts.length ? 'Overtime: ' + parts.join('; ') : 'No overtime rule';
}

export function money(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
