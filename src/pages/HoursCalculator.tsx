import { Link } from 'react-router-dom';
import { Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { CopyResultLink } from '../components/CopyResultLink';
import { useHashState } from '../components/useHashState';
import { formatDecimal, formatHM, pairMinutes } from '../lib/time';

export default function HoursCalculator() {
  const [s, set] = useHashState({ start: '09:00', end: '17:30', brk: '30' });
  const gross = pairMinutes({ start: s.start, end: s.end });
  const brk = Math.max(0, Number(s.brk) || 0);
  const worked = gross == null ? null : Math.max(0, gross - brk);
  const overnight = gross != null && s.end <= s.start && s.end !== s.start;
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Work Hours Calculator</h1>
      <p className="mb-5 mt-2 text-ink-700">Find out how many hours you worked between two times, minus your break. Works for overnight shifts too.</p>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" htmlFor="start"><input id="start" type="time" className={inputCls} value={s.start} onChange={(e) => set('start', e.target.value)} /></Field>
          <Field label="End time" htmlFor="end"><input id="end" type="time" className={inputCls} value={s.end} onChange={(e) => set('end', e.target.value)} /></Field>
          <Field label="Unpaid break (minutes)" htmlFor="brk"><input id="brk" type="number" inputMode="numeric" min={0} className={inputCls} value={s.brk} onChange={(e) => set('brk', e.target.value)} /></Field>
        </div>
        <div className="mt-5 rounded-2xl bg-ink-100 p-4" aria-live="polite">
          {worked == null ? <p className="text-ink-500">Enter a start and end time.</p> : (
            <>
              <p className="text-sm font-medium text-ink-500">Hours worked</p>
              <p className="text-4xl font-extrabold" data-testid="hours-result">{formatHM(worked)}</p>
              <p className="text-ink-700"><strong>{formatDecimal(worked)}</strong> decimal hours · {Math.floor(worked / 60)} h {worked % 60} min</p>
              {overnight && <p className="mt-1 text-sm text-ink-500">Counted as an overnight shift ending the next day.</p>}
              {brk > (gross ?? 0) && <p className="mt-1 text-sm text-amber-700">The break is longer than the shift.</p>}
            </>
          )}
        </div>
        <div className="mt-2 flex justify-end"><CopyResultLink /></div>
      </Card>
      <CtaCalculator text="Worked several days? Add up the whole week, with overtime." />
      <Prose>
        <h2>How to calculate hours worked between two times</h2>
        <ol>
          <li>Convert both times to the 24-hour clock. 5:30 PM becomes 17:30.</li>
          <li>Subtract the start from the end: 17:30 − 9:00 = 8 hours 30 minutes.</li>
          <li>If the end time is smaller than the start time, the shift went past midnight. Add 24 hours to the end time first: 22:00 to 06:00 is 30:00 − 22:00 = 8 hours.</li>
          <li>Subtract any unpaid break: 8:30 − 0:30 = 8 hours.</li>
          <li>For payroll, convert the minutes to a decimal by dividing by 60: 8 h 15 min = 8.25 hours.</li>
        </ol>
        <h2>Examples</h2>
        <table>
          <thead><tr><th>Shift</th><th>Break</th><th>Hours</th><th>Decimal</th></tr></thead>
          <tbody>
            {[['8:00 AM – 4:30 PM', 30], ['9:00 AM – 5:00 PM', 60], ['7:00 AM – 3:30 PM', 30], ['2:00 PM – 10:45 PM', 45], ['11:00 PM – 7:00 AM', 30]].map(([label, b]) => {
              const [a, z] = String(label).split(' – ');
              const to24 = (t: string) => { const [hm, ap] = t.split(' '); let [h, m] = hm.split(':').map(Number); if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
              const w = Math.max(0, (pairMinutes({ start: to24(a), end: to24(z) }) ?? 0) - Number(b));
              return <tr key={String(label)}><td>{label}</td><td>{b} min</td><td>{formatHM(w)}</td><td>{formatDecimal(w)}</td></tr>;
            })}
          </tbody>
        </table>
        <p>Need to convert a total to decimal? Use the <Link to="/time-to-decimal/">time to decimal converter</Link>. Reading a 24-hour time clock? See the <Link to="/military-time-converter/">military time chart</Link>.</p>
      </Prose>
      <Faq items={[
        ['How many hours is 9 to 5?', <p>9:00 AM to 5:00 PM is 8 hours. With a 30-minute unpaid lunch it is 7.5 hours, and with a one-hour lunch it is 7 hours.</p>],
        ['How many hours is 7 to 3:30?', <p>7:00 AM to 3:30 PM is 8 hours 30 minutes. With a 30-minute unpaid break that is exactly 8 hours.</p>],
        ['How do I calculate a night shift that ends the next morning?', <p>Add 24 hours to the end time before subtracting. This calculator does it automatically when the end time is earlier than the start time.</p>],
        ['Should I include my lunch break?', <p>Only paid breaks count as hours worked. Enter unpaid meal breaks in the break field so they are subtracted. Short rest breaks are often paid, but check your employer's policy.</p>],
      ]} />
    </>
  );
}
