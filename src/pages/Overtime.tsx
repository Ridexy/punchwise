import { Link } from 'react-router-dom';
import { Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { CopyResultLink } from '../components/CopyResultLink';
import { useHashState } from '../components/useHashState';
import { formatDecimal, formatHM, parseDuration, round2 } from '../lib/time';
import { money } from '../lib/describe';

export default function Overtime() {
  const [s, set] = useHashState({ rate: '20', hours: '46', threshold: '40', mult: '1.5', dt: '', dtMult: '2' });
  const rate = Number(s.rate);
  const total = parseDuration(s.hours);
  const threshold = Number(s.threshold);
  const mult = Number(s.mult) || 1.5;
  const dt = parseDuration(s.dt || '0') ?? 0;
  const dtMult = Number(s.dtMult) || 2;
  const valid = total != null && rate >= 0 && threshold >= 0 && isFinite(rate);
  const nonDouble = valid ? Math.max(0, total! - dt) : 0;
  const reg = Math.min(nonDouble, threshold * 60);
  const ot = Math.max(0, nonDouble - threshold * 60);
  const regPay = round2((reg / 60) * rate), otPay = round2((ot / 60) * rate * mult), dtPay = round2((dt / 60) * rate * dtMult);
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Overtime Calculator</h1>
      <p className="mb-5 mt-2 text-ink-700">Work out your overtime pay from your hourly rate and the hours you worked. Time and a half, double time, or your own multiplier.</p>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hourly rate" htmlFor="rate"><input id="rate" type="number" inputMode="decimal" min={0} step="0.01" className={inputCls} value={s.rate} onChange={(e) => set('rate', e.target.value)} /></Field>
          <Field label="Hours worked this week" htmlFor="hours" hint="e.g. 46, 46.5 or 46:30"><input id="hours" inputMode="decimal" className={inputCls} value={s.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
          <Field label="Overtime after (hours)" htmlFor="th"><input id="th" type="number" inputMode="decimal" min={0} className={inputCls} value={s.threshold} onChange={(e) => set('threshold', e.target.value)} /></Field>
          <Field label="Overtime multiplier" htmlFor="mult"><select id="mult" className={inputCls} value={s.mult} onChange={(e) => set('mult', e.target.value)}>
            <option value="1.5">1.5× (time and a half)</option><option value="2">2× (double time)</option><option value="1.25">1.25×</option><option value="1.75">1.75×</option></select></Field>
          <Field label="Of which double-time hours" htmlFor="dt" hint="Optional, e.g. hours over 12 in a day"><input id="dt" inputMode="decimal" className={inputCls} value={s.dt} placeholder="0" onChange={(e) => set('dt', e.target.value)} /></Field>
          <Field label="Double-time multiplier" htmlFor="dtm"><input id="dtm" type="number" inputMode="decimal" min={1} step="0.25" className={inputCls} value={s.dtMult} onChange={(e) => set('dtMult', e.target.value)} /></Field>
        </div>
        <div className="mt-5 rounded-2xl bg-ink-100 p-4" aria-live="polite">
          {!valid ? <p className="text-ink-500">Enter your rate and hours.</p> : (
            <>
              <p className="text-sm font-medium text-ink-500">Total gross pay</p>
              <p className="text-4xl font-extrabold" data-testid="ot-total">{money(regPay + otPay + dtPay, '$')}</p>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  <tr><td className="py-1">Regular: {formatHM(reg)} h ({formatDecimal(reg)}) × {money(rate, '$')}</td><td className="text-right font-semibold">{money(regPay, '$')}</td></tr>
                  <tr><td className="py-1">Overtime: {formatHM(ot)} h ({formatDecimal(ot)}) × {money(round2(rate * mult), '$')}</td><td className="text-right font-semibold" data-testid="ot-pay">{money(otPay, '$')}</td></tr>
                  {dt > 0 && <tr><td className="py-1">Double time: {formatHM(dt)} h × {money(round2(rate * dtMult), '$')}</td><td className="text-right font-semibold">{money(dtPay, '$')}</td></tr>}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-500">Overtime rate: {money(round2(rate * mult), '$')}/h. Gross pay before tax. Use the same steps for any currency.</p>
            </>
          )}
        </div>
        <div className="mt-2 flex justify-end"><CopyResultLink /></div>
      </Card>
      <CtaCalculator text="Don't know your weekly total yet? Enter your clock-in times and we'll work out the overtime." />
      <Prose>
        <h2>How overtime pay is calculated</h2>
        <ol>
          <li>Find your overtime hours: hours worked minus the threshold. 46 − 40 = 6 hours.</li>
          <li>Find your overtime rate: hourly rate × multiplier. $20 × 1.5 = $30 an hour.</li>
          <li>Multiply: 6 × $30 = $180 overtime pay.</li>
          <li>Add regular pay: 40 × $20 = $800, so the week totals $980 before tax.</li>
        </ol>
        <h2>Time and a half vs double time</h2>
        <p><strong>Time and a half</strong> means 1.5× your regular rate. In the US it is required under federal law for non-exempt employees after 40 hours in a workweek. <strong>Double time</strong> is 2× your rate. No US federal law requires it, but some states (for example California, after 12 hours in a day) and many union contracts and holiday policies do.</p>
        <p>Other countries handle overtime differently. In many places it depends on your contract rather than a single legal threshold. Always check your contract and local rules.</p>
        <h2>Converting minutes for overtime</h2>
        <p>If you worked 6 hours 45 minutes of overtime, use 6.75 hours, not 6.45. Divide the minutes by 60 first, or use our <Link to="/time-to-decimal/">time to decimal converter</Link>.</p>
      </Prose>
      <Faq items={[
        ['What is time and a half for $20 an hour?', <p>$30 an hour. Multiply the regular rate by 1.5.</p>],
        ['Is overtime calculated per day or per week?', <p>Under US federal law it is per workweek (over 40 hours). Some states, including California, also require daily overtime. Elsewhere it depends on local law and your contract.</p>],
        ['Do paid holidays or sick days count toward overtime?', <p>Usually not. Under US federal rules, overtime is based on hours actually worked, so paid time off doesn't count unless your employer's policy or a contract says it does.</p>],
        ['Is a biweekly paycheck checked against 80 hours?', <p>No, not under US federal rules. Each 7-day workweek is checked separately. Working 50 hours one week and 30 the next still earns 10 overtime hours. The <Link to="/">time card calculator</Link> splits biweekly periods correctly.</p>],
      ]} />
    </>
  );
}
