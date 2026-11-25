import { computeSheet, type Timesheet } from '../lib/model';
import { WEEKDAYS, displayTime, formatDate, formatDecimal, formatHM, weekday, type PeriodResult } from '../lib/time';
import { describeRule, money } from '../lib/describe';

export function Totals({ ts, res }: { ts: Timesheet; res: PeriodResult }) {
  const s = ts.settings;
  const rows: [string, number][] = [['Regular', res.total.regular], ['Overtime', res.total.overtime]];
  if (res.total.double || s.rule.dailyDoubleHours != null) rows.push(['Double time', res.total.double]);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">Total hours</p>
          <p className="text-4xl font-extrabold tracking-tight" data-testid="total-hm">{formatHM(res.total.worked)}</p>
          <p className="text-sm text-ink-500"><span data-testid="total-dec">{formatDecimal(res.total.worked)}</span> decimal hours</p>
        </div>
        {res.pay && (
          <div className="text-right">
            <p className="text-sm font-medium text-ink-500">Gross pay</p>
            <p className="text-3xl font-extrabold tracking-tight text-brand-700" data-testid="total-pay">{money(res.pay.total, s.currency)}</p>
            <p className="text-xs text-ink-500">estimate, before tax</p>
          </div>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-ink-100 p-2">
            <dt className="text-xs font-medium text-ink-500">{k}</dt>
            <dd className="font-bold">{formatHM(v)}</dd>
            <dd className="text-xs text-ink-500">{formatDecimal(v)} h</dd>
          </div>
        ))}
      </dl>
      {res.pay && (res.pay.overtime > 0 || res.pay.double > 0) && (
        <p className="mt-2 text-sm text-ink-700" data-testid="pay-split">
          Regular {money(res.pay.regular, s.currency)} + overtime {money(res.pay.overtime, s.currency)}
          {res.pay.double > 0 && <> + double time {money(res.pay.double, s.currency)}</>}
        </p>
      )}
      {res.total.breaks > 0 && <p className="mt-2 text-sm text-ink-700" data-testid="total-breaks">Unpaid breaks deducted: <strong>{formatHM(res.total.breaks)}</strong></p>}
      <p className="mt-2 text-xs text-ink-500">{describeRule(s.rule)}{s.otRate ? ` · overtime rate ${money(s.otRate, s.currency)}/h` : ''}{s.rounding ? ` · punches rounded to ${s.rounding} min` : ''}</p>
      {res.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {res.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Read-only table used on the shared /view/ page. */
export function ReadOnlyTable({ ts }: { ts: Timesheet }) {
  const res = computeSheet(ts);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-ink-500">
          <tr><th className="py-2 pr-2">Day</th><th className="pr-2">In – Out</th><th className="pr-2">Break</th><th className="text-right">Hours</th></tr>
        </thead>
        <tbody>
          {ts.days.map((d, i) => {
            const pairs = d.pairs.filter((p) => p.start || p.end);
            return (
              <tr key={d.date} className={`border-t border-ink-300/50 ${i === 7 ? 'border-t-2 border-t-ink-700' : ''}`}>
                <td className="py-2 pr-2 font-medium">{WEEKDAYS[weekday(d.date)].slice(0, 3)} {formatDate(d.date)}</td>
                <td className="pr-2">{pairs.length ? pairs.map((p, k) => <div key={k}>{displayTime(p.start, ts.settings.clock) || '?'} – {displayTime(p.end, ts.settings.clock) || '?'}</div>) : <span className="text-ink-500">–</span>}</td>
                <td className="pr-2">{d.breakMin ? `${d.breakMin}m` : ''}</td>
                <td className="text-right font-semibold">{res.days[i].worked ? formatHM(res.days[i].worked) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
