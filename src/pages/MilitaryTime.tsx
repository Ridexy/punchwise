import { Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { CopyResultLink } from '../components/CopyResultLink';
import { PrintButton } from '../components/PrintButton';
import { useHashState } from '../components/useHashState';
import { displayTime, parse12h, parseMilitary, toTimeString } from '../lib/time';

const mil = (m: number) => toTimeString(m).replace(':', '');

export default function MilitaryTime() {
  const [s, set] = useHashState({ std: '7:30 PM', mil: '1930' });
  const a = parse12h(s.std);
  const b = parseMilitary(s.mil);
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Military Time Converter</h1>
      <p className="mb-5 mt-2 text-ink-700">Convert regular 12-hour time to military (24-hour) time and back. There's a full chart below that you can print.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">Standard → military</h2>
          <Field label="Standard time" htmlFor="std" hint="e.g. 7:30 PM, 12am, 6:05 a"><input id="std" className={inputCls} value={s.std} onChange={(e) => set('std', e.target.value)} /></Field>
          <p className="mt-3 text-4xl font-extrabold" aria-live="polite" data-testid="mil-result">{a == null ? '–' : mil(a)}</p>
          <p className="text-sm text-ink-500">{a == null ? 'Enter a time like 7:30 PM' : `Said "${spoken(a)}"`}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Military → standard</h2>
          <Field label="Military time" htmlFor="mil" hint="e.g. 1930 or 0745"><input id="mil" inputMode="numeric" className={inputCls} value={s.mil} onChange={(e) => set('mil', e.target.value)} /></Field>
          <p className="mt-3 text-4xl font-extrabold" aria-live="polite" data-testid="std-result">{b == null ? '–' : displayTime(toTimeString(b), 12)}</p>
          <p className="text-sm text-ink-500">{b == null ? 'Enter 3–4 digits, 0000 to 2359' : `${mil(b)} in 24-hour clock is ${toTimeString(b)}`}</p>
        </Card>
      </div>
      <div className="mt-2 flex justify-end"><CopyResultLink /></div>
      <CtaCalculator text="Clocked in and out in 24-hour time? Add up your week's hours." />
      <Prose>
        <h2>How to convert to military time</h2>
        <ul>
          <li><strong>AM times:</strong> keep the numbers and add a leading zero. 7:30 AM → 0730. The exception is 12 AM (midnight), which is 0000.</li>
          <li><strong>PM times:</strong> add 12 to the hour. 7:30 PM → 19 + 30 → 1930. The exception is 12 PM (noon), which stays 1200.</li>
          <li><strong>Back to standard:</strong> if the hour is 13 or more, subtract 12 and add PM. 1645 → 4:45 PM.</li>
        </ul>
        <div className="flex items-center justify-between gap-2">
          <h2 className="!mt-6">Military time chart</h2>
          <PrintButton />
        </div>
        <div className="print-area grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {[0, 12].map((off) => (
            <table key={off}>
              <thead><tr><th>Standard</th><th>Military</th><th>24-hour</th></tr></thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => (off + i) * 60).map((m) => <tr key={m}><td>{displayTime(toTimeString(m), 12)}</td><td>{mil(m)}</td><td>{toTimeString(m)}</td></tr>)}
              </tbody>
            </table>
          ))}
        </div>
      </Prose>
      <Faq items={[
        ['What is 1500 in military time?', <p>3:00 PM. Subtract 12 from 15.</p>],
        ['Is midnight 0000 or 2400?', <p>Midnight at the start of a day is 0000. Some schedules write 2400 for the end of a day, but most time clocks use 0000.</p>],
        ['How do you say military time?', <p>1930 is said "nineteen thirty". Times on the hour, like 1900, are said "nineteen hundred". Times with a leading zero, like 0730, are said "zero seven thirty".</p>],
        ['Why do time clocks use military time?', <p>It avoids AM/PM mistakes on overnight shifts. 2200 to 0600 can only mean one thing, which makes it easier to <a href="/hours-calculator/">calculate hours worked</a>.</p>],
      ]} />
    </>
  );
}

function spoken(m: number) {
  const h = Math.floor(m / 60), mm = m % 60;
  const hs = h === 0 ? 'zero zero' : h < 10 ? `zero ${h}` : String(h);
  return mm === 0 ? `${hs} hundred` : `${hs} ${mm < 10 ? 'oh ' + mm : mm}`;
}
