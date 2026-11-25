import { Link } from 'react-router-dom';
import { Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { CopyResultLink } from '../components/CopyResultLink';
import { PrintButton } from '../components/PrintButton';
import { useHashState } from '../components/useHashState';
import { formatHM, parseDuration } from '../lib/time';

export default function TimeToDecimal() {
  const [s, set] = useHashState({ hm: '7:45', dec: '7.75' });
  const m = parseDuration(s.hm.includes(':') || /[hm]/i.test(s.hm) ? s.hm : `${s.hm}m`);
  const decNum = Number(s.dec);
  const back = s.dec.trim() !== '' && isFinite(decNum) && decNum >= 0 ? Math.round(decNum * 60) : null;
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Time to Decimal Calculator</h1>
      <p className="mb-5 mt-2 text-ink-700">Convert hours and minutes to decimal hours for payroll and invoices, or turn decimal hours back into hours and minutes.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">Hours:minutes → decimal</h2>
          <Field label="Time" htmlFor="hm" hint="7:45, 7h 45m, or minutes like 45"><input id="hm" className={inputCls} value={s.hm} onChange={(e) => set('hm', e.target.value)} /></Field>
          <p className="mt-3 text-4xl font-extrabold" aria-live="polite" data-testid="dec-result">{m == null ? '–' : (m / 60).toFixed(2)}</p>
          <p className="text-sm text-ink-500">{m == null ? 'Enter a time' : `${m} minutes ÷ 60 = ${(m / 60).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} hours`}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Decimal → hours:minutes</h2>
          <Field label="Decimal hours" htmlFor="dec" hint="e.g. 7.75"><input id="dec" inputMode="decimal" className={inputCls} value={s.dec} onChange={(e) => set('dec', e.target.value)} /></Field>
          <p className="mt-3 text-4xl font-extrabold" aria-live="polite" data-testid="hm-result">{back == null ? '–' : formatHM(back)}</p>
          <p className="text-sm text-ink-500">{back == null ? 'Enter a number' : `${Math.floor(back / 60)} hours ${back % 60} minutes`}</p>
        </Card>
      </div>
      <div className="mt-2 flex justify-end"><CopyResultLink /></div>
      <CtaCalculator text="Want your whole timesheet in decimal hours automatically?" />
      <Prose>
        <h2>How to convert minutes to decimal hours</h2>
        <p>Divide the minutes by 60 and add the result to the whole hours. For 7 hours 45 minutes: 45 ÷ 60 = 0.75, so the answer is 7.75 hours. To go back, multiply the decimal part by 60: 0.75 × 60 = 45 minutes.</p>
        <p>Payroll uses decimal hours because pay is hours × rate. A common mistake is to type 7.45 for 7 hours 45 minutes. That underpays by 18 minutes, because 7.45 hours is really 7 hours 27 minutes.</p>
        <div className="flex items-center justify-between gap-2">
          <h2 className="!mt-6">Minutes to decimal hours chart</h2>
          <PrintButton />
        </div>
        <div className="print-area grid grid-cols-2 gap-x-6 sm:grid-cols-3">
          {[0, 1, 2].map((col) => (
            <table key={col} className={col === 2 ? 'hidden sm:table' : ''}>
              <thead><tr><th>Minutes</th><th>Decimal</th></tr></thead>
              <tbody>
                {Array.from({ length: 20 }, (_, i) => col * 20 + i + 1).map((n) => <tr key={n}><td>{n}</td><td>{(n / 60).toFixed(2)}</td></tr>)}
              </tbody>
            </table>
          ))}
          <table className="sm:hidden">
            <thead><tr><th>Minutes</th><th>Decimal</th></tr></thead>
            <tbody>{Array.from({ length: 20 }, (_, i) => 41 + i).map((n) => <tr key={n}><td>{n}</td><td>{(n / 60).toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-sm">Values rounded to 2 decimal places, which is what most payroll systems use. Some employers use 6-minute (0.1 hour) increments instead. Ask which yours uses.</p>
      </Prose>
      <Faq items={[
        ['What is 15 minutes in decimal?', <p>0.25 hours. 30 minutes is 0.5 and 45 minutes is 0.75.</p>],
        ['How do I write 8 hours 20 minutes as a decimal?', <p>20 ÷ 60 = 0.33, so 8.33 hours.</p>],
        ['What is 0.1 of an hour?', <p>6 minutes. That's why some time clocks round to 6-minute increments: each one is a tenth of an hour.</p>],
        ['How do I add up hours and minutes?', <p>Convert each entry to minutes or decimal hours, add them, then convert back. The <Link to="/">time card calculator</Link> does this for a whole week.</p>],
      ]} />
    </>
  );
}
