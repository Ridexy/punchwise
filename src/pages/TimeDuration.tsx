import { Link } from 'react-router-dom';
import { Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { CopyResultLink } from '../components/CopyResultLink';
import { useHashState } from '../components/useHashState';
import { displayTime, formatDecimal, formatHM, parseDuration, parseTime, toTimeString } from '../lib/time';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function minutesBetween(d1: string, t1: string, d2: string, t2: string): number | null {
  if (!ISO.test(d1) || !ISO.test(d2)) return null;
  const a = parseTime(t1), b = parseTime(t2);
  if (a == null || b == null) return null;
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 60000;
  return day(d2) + b - (day(d1) + a);
}

export default function TimeDuration() {
  const [s, set] = useHashState({ d1: '2026-11-23', t1: '08:00', d2: '2026-11-25', t2: '17:30', base: '09:15', amt: '7:45', op: 'add' });
  const diff = minutesBetween(s.d1, s.t1, s.d2, s.t2);
  const base = parseTime(s.base), amt = parseDuration(s.amt);
  const shifted = base != null && amt != null ? base + (s.op === 'add' ? amt : -amt) : null;
  const dayShift = shifted == null ? 0 : Math.floor(shifted / 1440);
  const abs = diff == null ? 0 : Math.abs(diff);
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Time Duration Calculator</h1>
      <p className="mb-5 mt-2 text-ink-700">Find the exact time between two dates and times, or add and subtract hours and minutes from a clock time.</p>
      <Card>
        <h2 className="mb-3 font-bold">Time between two dates and times</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" htmlFor="d1"><input id="d1" type="date" className={inputCls} value={s.d1} onChange={(e) => set('d1', e.target.value)} /></Field>
          <Field label="Start time" htmlFor="t1"><input id="t1" type="time" className={inputCls} value={s.t1} onChange={(e) => set('t1', e.target.value)} /></Field>
          <Field label="End date" htmlFor="d2"><input id="d2" type="date" className={inputCls} value={s.d2} onChange={(e) => set('d2', e.target.value)} /></Field>
          <Field label="End time" htmlFor="t2"><input id="t2" type="time" className={inputCls} value={s.t2} onChange={(e) => set('t2', e.target.value)} /></Field>
        </div>
        <div className="mt-4 rounded-2xl bg-ink-100 p-4" aria-live="polite">
          {diff == null ? <p className="text-ink-500">Enter both dates and times.</p> : (
            <>
              <p className="text-sm font-medium text-ink-500">{diff < 0 ? 'The end is before the start by' : 'Duration'}</p>
              <p className="text-4xl font-extrabold" data-testid="dur-result">{Math.floor(abs / 1440)} d {Math.floor((abs % 1440) / 60)} h {abs % 60} min</p>
              <p className="text-ink-700">= <strong data-testid="dur-hm">{formatHM(abs)}</strong> hours · {formatDecimal(abs)} decimal hours · {abs.toLocaleString('en-US')} minutes</p>
            </>
          )}
        </div>
      </Card>
      <Card className="mt-4">
        <h2 className="mb-3 font-bold">Add or subtract time</h2>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="Time" htmlFor="base"><input id="base" type="time" className={inputCls} value={s.base} onChange={(e) => set('base', e.target.value)} /></Field>
          <select aria-label="Add or subtract" className={`${inputCls} w-20`} value={s.op} onChange={(e) => set('op', e.target.value)}><option value="add">+</option><option value="sub">−</option></select>
          <Field label="Hours:minutes" htmlFor="amt"><input id="amt" className={inputCls} value={s.amt} onChange={(e) => set('amt', e.target.value)} placeholder="7:45" /></Field>
        </div>
        <p className="mt-4 text-3xl font-extrabold" aria-live="polite" data-testid="shift-result">
          {shifted == null ? '–' : displayTime(toTimeString(shifted), 12)}
          {dayShift !== 0 && <span className="ml-2 text-base font-semibold text-brand-700">{dayShift > 0 ? `+${dayShift} day${dayShift > 1 ? 's' : ''}` : `${dayShift} day${dayShift < -1 ? 's' : ''}`}</span>}
        </p>
        <p className="text-sm text-ink-500">Useful for working out when a shift ends: start 9:15 AM + 7:45 = 5:00 PM.</p>
      </Card>
      <div className="mt-2 flex justify-end"><CopyResultLink /></div>
      <CtaCalculator text="Adding up shifts for payroll? The time card calculator totals a whole week." />
      <Prose>
        <h2>How to calculate the time between two dates</h2>
        <ol>
          <li>Count the whole days between the two dates.</li>
          <li>Work out the difference between the two clock times. If the end time is earlier in the day than the start time, borrow a day (24 hours).</li>
          <li>Add the two together. From Monday 8:00 AM to Wednesday 5:30 PM is 2 days and 9 hours 30 minutes, which is 57.5 hours.</li>
        </ol>
        <p>This calculator uses calendar dates and clock times exactly as you enter them. It doesn't adjust for daylight-saving clock changes, which can add or remove an hour on the night the clocks change.</p>
        <h2>Duration vs hours worked</h2>
        <p>Duration is the total elapsed time. For a work shift you usually want hours <em>worked</em>, which means subtracting unpaid breaks. Use the <Link to="/hours-calculator/">work hours calculator</Link> for a single shift, or the <Link to="/">time card calculator</Link> for a whole week.</p>
      </Prose>
      <Faq items={[
        ['How many hours are there between two dates?', <p>Multiply the whole days by 24, then add the difference between the clock times. Monday 8:00 AM to Wednesday 5:30 PM is 2 × 24 + 9.5 = 57.5 hours.</p>],
        ['How do I add hours and minutes to a time?', <p>Add the minutes first. If they come to 60 or more, carry one hour. Then add the hours. 9:15 + 7:45 is 16:60, which is 17:00 (5:00 PM).</p>],
        ['How do I convert the result to decimal hours?', <p>Divide the minutes by 60. 9 hours 30 minutes is 9.5 hours. See the <Link to="/time-to-decimal/">time to decimal chart</Link>.</p>],
      ]} />
    </>
  );
}
