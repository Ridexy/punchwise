import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_SETTINGS, buildDays, createTimesheet, hasAnyTime, nextPeriodCopy, periodLength, realign,
  type Settings, type Timesheet,
} from '../lib/model';
import { PRESETS, WEEKDAYS, addDays, computePeriod, formatDate, formatDecimal, formatHM, nowHHMM, todayISO, weekday, type Day, type OvertimePreset } from '../lib/time';
import { getMeta, getSheet, memoryOnly, requestPersistence, saveSheet, setMeta } from '../lib/db';
import { decodeSetup, encodeSetup, encodeTimesheet, hashValue, type TeamSetup } from '../lib/share';
import { downloadBlob, pdfBlob, slug } from '../lib/download';
import { money } from '../lib/describe';
import { Button, Card, Field, Modal, Toast, inputCls } from './ui';
import { ShareSheet, type ShareSpec } from './ShareSheet';
import { SignaturePad } from './SignaturePad';
import { Totals } from './Summary';
import { useToast } from './useToast';
import { SITE_NAME } from '../site';

const BREAKS = [0, 15, 30, 45, 60];
const PRESET_LABELS: Record<OvertimePreset, [string, string]> = {
  weekly40: ['Over 40 h/week', 'Time and a half after 40 hours in a workweek. The US federal default.'],
  daily8: ['Daily + weekly', '1.5x after 8 h/day, 2x after 12 h/day, and 1.5x after 40 h/week (California-style).'],
  none: ['No overtime', 'Every hour is paid at the regular rate.'],
  custom: ['Custom', 'Set your own thresholds and multipliers.'],
};

export function periodLabel(ts: Timesheet) {
  return `${formatDate(ts.startDate)} – ${formatDate(addDays(ts.startDate, ts.days.length - 1), 'long').replace(/^\w+, /, '')}`;
}

export function shareTextFor(ts: Timesheet) {
  const r = computePeriod(ts.days, ts.settings.rule, ts.settings.rate, ts.settings.rounding);
  const who = ts.employee ? `${ts.employee}'s timesheet` : 'My timesheet';
  const pay = r.pay ? `, ${money(r.pay.total, ts.settings.currency)} gross` : '';
  return `${who} for ${periodLabel(ts)}: ${formatHM(r.total.worked)} hours (${formatDecimal(r.total.worked)})${pay}.`;
}

export async function pdfFileFor(ts: Timesheet, supervisorSignature?: string | null) {
  const { timesheetPdf } = await import('../lib/pdf');
  const bytes = await timesheetPdf(ts, { supervisorSignature });
  return { blob: pdfBlob(bytes), filename: `timesheet-${slug(ts.employee) || 'hours'}-${ts.startDate}.pdf` };
}

export function Calculator() {
  const [ts, setTs] = useState<Timesheet | null>(null);
  const [team, setTeam] = useState<TeamSetup | null>(null);
  const [share, setShare] = useState<ShareSpec | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const latest = useRef<Timesheet | null>(null);
  latest.current = ts;

  // Load: team setup link > current sheet > new sheet with last settings.
  useEffect(() => {
    (async () => {
      const setupPayload = hashValue(location.hash, 'setup');
      const setup = setupPayload ? decodeSetup(setupPayload) : null;
      const openTeam = location.hash === '#team';
      const profile = (await getMeta<{ employee: string; employer: string }>('profile')) ?? { employee: '', employer: '' };
      const lastSettings = await getMeta<Settings>('lastSettings');
      const curId = await getMeta<string>('currentId');
      let sheet = curId ? await getSheet(curId) : undefined;
      if (setup) {
        await setMeta('team', setup);
        if (!sheet || hasAnyTime(sheet)) sheet = createTimesheet(setup.settings);
        else sheet = realign(sheet, { settings: { ...setup.settings, rate: sheet.settings.rate ?? setup.settings.rate } });
        sheet = { ...sheet, employer: setup.employer, manager: setup.manager, employee: sheet.employee || profile.employee };
        showToast(setup.manager ? `Set up by ${setup.manager}` : 'Team settings applied');
      }
      const savedTeam = setup ?? (await getMeta<TeamSetup>('team')) ?? null;
      if (!sheet) {
        sheet = createTimesheet(lastSettings ?? DEFAULT_SETTINGS);
        sheet.employee = profile.employee;
        sheet.employer = savedTeam?.employer || profile.employer;
        sheet.manager = savedTeam?.manager ?? '';
      }
      if (setupPayload || openTeam) history.replaceState(null, '', location.pathname);
      setTeam(savedTeam);
      setTs(sheet);
      if (openTeam) setTeamOpen(true);
      requestPersistence();
    })();
  }, [showToast]);

  // Autosave (debounced) + flush when the page is hidden.
  const persist = useCallback(async (t: Timesheet) => {
    await setMeta('currentId', t.id);
    await setMeta('lastSettings', t.settings);
    await setMeta('profile', { employee: t.employee, employer: t.employer });
    if (hasAnyTime(t) || t.employee) await saveSheet(t);
  }, []);
  useEffect(() => {
    if (!ts) return;
    const h = setTimeout(() => persist(ts), 250);
    return () => clearTimeout(h);
  }, [ts, persist]);
  useEffect(() => {
    const flush = () => { if (latest.current) persist(latest.current); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, [persist]);

  const update = useCallback((fn: (t: Timesheet) => Timesheet) => setTs((t) => (t ? { ...fn(t), updatedAt: Date.now() } : t)), []);
  const setDay = (i: number, fn: (d: Day) => Day) => update((t) => ({ ...t, days: t.days.map((d, k) => (k === i ? fn(d) : d)) }));
  const setSettings = (patch: Partial<Settings>) => update((t) => {
    const settings = { ...t.settings, ...patch };
    return patch.period !== undefined || patch.weekStart !== undefined ? realign(t, { settings }) : { ...t, settings };
  });
  const shiftPeriod = (dir: 1 | -1) => update((t) => {
    const startDate = addDays(t.startDate, dir * periodLength(t.settings));
    return { ...t, startDate, days: t.days.map((d, i) => ({ ...d, date: addDays(startDate, i) })) };
  });

  const res = useMemo(() => (ts ? computePeriod(ts.days, ts.settings.rule, ts.settings.rate, ts.settings.rounding) : null), [ts]);
  const today = useMemo(() => todayISO(), []);

  const punch = (i: number) => {
    const now = nowHHMM();
    setDay(i, (d) => {
      const pairs = d.pairs.map((p) => ({ ...p }));
      const open = pairs.find((p) => p.start && !p.end);
      if (open) open.end = now;
      else {
        const blank = pairs.find((p) => !p.start && !p.end);
        if (blank) blank.start = now; else pairs.push({ start: now, end: '' });
      }
      return { ...d, pairs };
    });
  };

  const downloadPdf = async () => {
    if (!ts) return;
    setBusy(true);
    try {
      const { blob, filename } = await pdfFileFor(ts);
      downloadBlob(blob, filename);
      showToast('PDF downloaded');
    } catch (e) {
      showToast('Could not create the PDF: ' + (e as Error).message);
    } finally { setBusy(false); }
  };
  const downloadCsv = async () => {
    if (!ts) return;
    const { timesheetCsv } = await import('../lib/csv');
    downloadBlob(new Blob([timesheetCsv(ts)], { type: 'text/csv;charset=utf-8' }), `timesheet-${slug(ts.employee) || 'hours'}-${ts.startDate}.csv`);
  };
  const openShare = () => {
    if (!ts) return;
    setShare({
      title: ts.manager ? `Send to ${ts.manager}` : 'Send your timesheet',
      subject: `Timesheet ${periodLabel(ts)}${ts.employee ? ' - ' + ts.employee : ''}`,
      url: `${location.origin}/view/#d=${encodeTimesheet(ts)}`,
      text: shareTextFor(ts),
      note: 'Anyone with this link can see this timesheet. The data is inside the link itself; it is not uploaded anywhere. Drawn signatures are only included in the PDF.',
      file: () => pdfFileFor(ts),
    });
  };
  const newPeriod = async (copy: boolean) => {
    if (!ts) return;
    await persist(ts);
    const next = copy ? nextPeriodCopy(ts) : { ...nextPeriodCopy(ts), days: buildDays(addDays(ts.startDate, periodLength(ts.settings)), periodLength(ts.settings)) };
    setTs(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(copy ? 'Copied to next period' : 'New blank period started');
  };

  const loaded = !!ts && !!res;
  const view = ts ?? createTimesheet(DEFAULT_SETTINGS, '2026-01-04'); // static, date-free preview for prerender
  const viewRes = res ?? computePeriod(view.days, view.settings.rule, null);
  const todayIndex = loaded ? view.days.findIndex((d) => d.date === today) : -1;
  const todayOpen = todayIndex >= 0 && view.days[todayIndex].pairs.some((p) => p.start && !p.end);

  return (
    <div className="flex flex-col gap-4">
      {team?.manager && loaded && (
        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-ink-900 ring-1 ring-brand-100">
          Set up by <strong>{team.manager}</strong>{team.employer && <> for <strong>{team.employer}</strong></>}. When your week is done, tap <strong>Send to {team.manager}</strong>.
        </div>
      )}
      {memoryOnly && loaded && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">This browser is not allowing local storage (private mode?). Your entries will be lost when you close the tab: download the PDF before leaving.</p>
      )}

      {/* Period + names */}
      <Card>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => shiftPeriod(-1)} disabled={!loaded} aria-label="Previous period" className="flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ring-ink-300 hover:bg-ink-100">‹</button>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Pay period</p>
            <p className="font-bold" data-testid="period">{loaded ? periodLabel(view) : (view.settings.period === 'weekly' ? 'This week' : 'This pay period')}</p>
          </div>
          <button onClick={() => shiftPeriod(1)} disabled={!loaded} aria-label="Next period" className="flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ring-ink-300 hover:bg-ink-100">›</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Period length">
          {(['weekly', 'biweekly'] as const).map((p) => (
            <button key={p} onClick={() => setSettings({ period: p })} disabled={!loaded} aria-pressed={view.settings.period === p}
              className={`min-h-[44px] rounded-xl text-sm font-semibold ${view.settings.period === p ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}`}>
              {p === 'weekly' ? 'Weekly' : 'Biweekly (2 weeks)'}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Your name" htmlFor="emp"><input id="emp" className={inputCls} value={view.employee} disabled={!loaded} autoComplete="name" placeholder="For the PDF (optional)" onChange={(e) => update((t) => ({ ...t, employee: e.target.value }))} /></Field>
          <Field label="Company" htmlFor="co"><input id="co" className={inputCls} value={view.employer} disabled={!loaded} autoComplete="organization" placeholder="Optional" onChange={(e) => update((t) => ({ ...t, employer: e.target.value }))} /></Field>
        </div>
      </Card>

      {todayIndex >= 0 && (
        <Button onClick={() => punch(todayIndex)} className="min-h-[56px] w-full text-lg" ariaLabel={todayOpen ? 'Clock out now' : 'Clock in now'}>
          {todayOpen ? '⏹ Clock out now' : '▶ Clock in now'} <span className="text-sm font-normal opacity-80">({nowHHMM()})</span>
        </Button>
      )}

      {/* Days */}
      <div className="flex flex-col gap-3" aria-label="Days">
        {view.days.map((d, i) => {
          const name = WEEKDAYS[weekday(d.date)];
          const worked = viewRes.days[i]?.worked ?? 0;
          const prev = i > 0 ? view.days[i - 1] : null;
          const isEmpty = !d.pairs.some((p) => p.start || p.end);
          const prevHas = prev?.pairs.some((p) => p.start && p.end);
          return (
            <div key={i} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${d.date === today && loaded ? 'ring-2 ring-brand-500' : 'ring-ink-300/50'} ${i === 7 ? 'mt-3' : ''}`} data-testid={`day-${i}`}>
              {i === 7 && <p className="-mt-1 mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Week 2</p>}
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold">{name}{loaded && <span className="ml-2 font-normal text-ink-500">{formatDate(d.date)}</span>}{d.date === today && loaded && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Today</span>}</h3>
                <span className={`text-lg font-extrabold ${worked ? 'text-ink-900' : 'text-ink-300'}`} data-testid={`day-total-${i}`}>{formatHM(worked)}</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_44px] items-end gap-2">
                <span className="text-xs font-medium text-ink-500">In</span><span className="text-xs font-medium text-ink-500">Out</span><span />
                {d.pairs.map((p, k) => (
                  <div key={k} className="contents">
                    <input type="time" className={inputCls} value={p.start} disabled={!loaded} aria-label={`${name} shift ${k + 1} clock in`}
                      onChange={(e) => setDay(i, (dd) => ({ ...dd, pairs: dd.pairs.map((pp, kk) => (kk === k ? { ...pp, start: e.target.value } : pp)) }))} />
                    <input type="time" className={inputCls} value={p.end} disabled={!loaded} aria-label={`${name} shift ${k + 1} clock out`}
                      onChange={(e) => setDay(i, (dd) => ({ ...dd, pairs: dd.pairs.map((pp, kk) => (kk === k ? { ...pp, end: e.target.value } : pp)) }))} />
                    {d.pairs.length > 1 || p.start || p.end ? (
                      <button aria-label={`Remove ${name} shift ${k + 1}`} disabled={!loaded} className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-ink-500 hover:bg-ink-100"
                        onClick={() => setDay(i, (dd) => ({ ...dd, pairs: dd.pairs.length > 1 ? dd.pairs.filter((_, kk) => kk !== k) : [{ start: '', end: '' }] }))}>×</button>
                    ) : <span />}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button disabled={!loaded || d.pairs.length >= 6} onClick={() => setDay(i, (dd) => ({ ...dd, pairs: [...dd.pairs, { start: '', end: '' }] }))} className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">+ Add shift</button>
                {isEmpty && prevHas && loaded && (
                  <button onClick={() => setDay(i, (dd) => ({ ...dd, pairs: prev!.pairs.map((p) => ({ ...p })), breakMin: prev!.breakMin }))} className="min-h-[40px] rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">Same as {WEEKDAYS[weekday(prev!.date)]}</button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1" role="group" aria-label={`${name} unpaid break in minutes`}>
                <span className="mr-1 text-xs font-medium leading-tight text-ink-500">Break<br />min</span>
                {BREAKS.map((b) => (
                  <button key={b} disabled={!loaded} aria-pressed={d.breakMin === b} aria-label={`${b} minute break`} onClick={() => setDay(i, (dd) => ({ ...dd, breakMin: b }))}
                    className={`h-10 min-w-[40px] flex-1 rounded-full text-sm font-semibold ${d.breakMin === b ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}`}>{b}</button>
                ))}
                <input type="number" inputMode="numeric" min={0} max={720} aria-label={`${name} other break minutes`} disabled={!loaded}
                  className="h-10 w-14 flex-none rounded-full border border-ink-300 px-2 text-center text-sm" value={BREAKS.includes(d.breakMin) ? '' : d.breakMin} placeholder="other"
                  onChange={(e) => setDay(i, (dd) => ({ ...dd, breakMin: Math.max(0, Math.min(720, Number(e.target.value) || 0)) }))} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pay & rules */}
      <Card>
        <h2 className="mb-3 text-lg font-bold">Pay and overtime</h2>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field label="Hourly rate (optional)" htmlFor="rate">
            <input id="rate" type="number" inputMode="decimal" min={0} step="0.01" className={inputCls} disabled={!loaded} placeholder="e.g. 18.50"
              value={view.settings.rate ?? ''} onChange={(e) => setSettings({ rate: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
          </Field>
          <Field label="Currency" htmlFor="cur">
            <select id="cur" className={inputCls} disabled={!loaded} value={view.settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
              {['$', '£', '€', 'A$', 'C$', '₦', '₹', 'R', '¥'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-ink-700">Overtime rule</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PRESET_LABELS) as OvertimePreset[]).map((p) => (
              <label key={p} className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ${view.settings.preset === p ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-ink-300'}`}>
                <input type="radio" name="preset" className="mt-1 h-5 w-5 accent-brand-600" checked={view.settings.preset === p} disabled={!loaded}
                  onChange={() => setSettings({ preset: p, rule: p === 'custom' ? { ...view.settings.rule } : { ...PRESETS[p] } })} />
                <span><span className="block font-semibold">{PRESET_LABELS[p][0]}</span><span className="block text-xs text-ink-500">{PRESET_LABELS[p][1]}</span></span>
              </label>
            ))}
          </div>
          {view.settings.preset === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {([['weeklyHours', 'OT after h/week'], ['dailyHours', 'OT after h/day'], ['dailyDoubleHours', '2x after h/day']] as const).map(([k, label]) => (
                <Field key={k} label={label} htmlFor={k}>
                  <input id={k} type="number" inputMode="decimal" min={0} step="0.5" className={inputCls} placeholder="off" value={view.settings.rule[k] ?? ''}
                    onChange={(e) => setSettings({ rule: { ...view.settings.rule, [k]: e.target.value === '' ? null : Number(e.target.value) } })} />
                </Field>
              ))}
              <Field label="OT multiplier" htmlFor="otm"><input id="otm" type="number" inputMode="decimal" min={1} step="0.25" className={inputCls} value={view.settings.rule.otMultiplier}
                onChange={(e) => setSettings({ rule: { ...view.settings.rule, otMultiplier: Number(e.target.value) || 1.5 } })} /></Field>
              <Field label="Double multiplier" htmlFor="dtm"><input id="dtm" type="number" inputMode="decimal" min={1} step="0.25" className={inputCls} value={view.settings.rule.dtMultiplier}
                onChange={(e) => setSettings({ rule: { ...view.settings.rule, dtMultiplier: Number(e.target.value) || 2 } })} /></Field>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-500">Rules differ by country, state and employer. Check yours. This is an estimate, not legal advice.</p>
        </fieldset>
        <details className="mt-4">
          <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold text-brand-700">More settings: rounding, week start, clock, paper size</summary>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Field label="Round punches to" htmlFor="round"><select id="round" className={inputCls} value={view.settings.rounding} onChange={(e) => setSettings({ rounding: Number(e.target.value) as Settings['rounding'] })}>
              <option value={0}>No rounding</option>{[5, 6, 10, 15].map((n) => <option key={n} value={n}>Nearest {n} min</option>)}</select></Field>
            <Field label="Week starts on" htmlFor="ws"><select id="ws" className={inputCls} value={view.settings.weekStart} onChange={(e) => setSettings({ weekStart: Number(e.target.value) })}>
              {WEEKDAYS.map((w, k) => <option key={w} value={k}>{w}</option>)}</select></Field>
            <Field label="Clock" htmlFor="clk"><select id="clk" className={inputCls} value={view.settings.clock} onChange={(e) => setSettings({ clock: Number(e.target.value) as 12 | 24 })}>
              <option value={12}>12-hour (AM/PM)</option><option value={24}>24-hour</option></select></Field>
            <Field label="PDF paper" htmlFor="paper"><select id="paper" className={inputCls} value={view.settings.paper} onChange={(e) => setSettings({ paper: e.target.value as Settings['paper'] })}>
              <option value="letter">US Letter</option><option value="a4">A4</option></select></Field>
          </div>
        </details>
      </Card>

      {/* Totals */}
      <Card><Totals ts={view} res={viewRes} /></Card>

      {/* Actions */}
      <Card>
        <h2 className="mb-3 text-lg font-bold">Send, print or save</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={openShare} disabled={!loaded} className="sm:col-span-2">{view.manager ? `Send to ${view.manager}` : 'Send timesheet'}</Button>
          <Button variant="secondary" onClick={downloadPdf} disabled={!loaded || busy}>{busy ? 'Creating PDF…' : 'Download PDF'}</Button>
          <Button variant="secondary" onClick={downloadCsv} disabled={!loaded}>Download CSV</Button>
          <Button variant="secondary" onClick={() => setSigOpen(true)} disabled={!loaded}>{view.signature ? 'Re-sign' : 'Sign timesheet'}</Button>
          <Link to="/saved/" className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 font-semibold text-ink-900 ring-1 ring-ink-300 hover:bg-ink-100">My timesheets</Link>
          <Button variant="ghost" onClick={() => newPeriod(true)} disabled={!loaded}>Copy to next {view.settings.period === 'weekly' ? 'week' : 'period'}</Button>
          <Button variant="ghost" onClick={() => newPeriod(false)} disabled={!loaded}>Start a blank {view.settings.period === 'weekly' ? 'week' : 'period'}</Button>
        </div>
        {view.signature && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-ink-100 p-3">
            <img src={view.signature} alt="Your signature" className="h-10 max-w-[160px] object-contain" />
            <span className="flex-1 text-sm text-ink-700">Signature added to the PDF</span>
            <button className="min-h-[40px] px-2 text-sm font-semibold text-red-700" onClick={() => update((t) => ({ ...t, signature: null }))}>Remove</button>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-500">Saved automatically on this device only. Clearing your browser data deletes saved timesheets, so keep the PDF or a <Link to="/saved/" className="underline">backup</Link>.</p>
      </Card>

      {/* Loop 2: team link */}
      <Card className="bg-gradient-to-br from-ink-900 to-brand-900 text-white ring-0">
        <h2 className="text-lg font-bold">Managers: get every timesheet in the same format</h2>
        <p className="mt-1 text-sm text-white/80">Create a team link with your pay period, week start and overtime rule. Your staff open it, fill in their hours and send their timesheet straight back to you. No accounts or app installs.</p>
        <Button onClick={() => setTeamOpen(true)} disabled={!loaded} className="mt-3 bg-white !text-ink-900 hover:bg-white/90">Create a team link</Button>
      </Card>

      {/* Sticky mobile summary */}
      {loaded && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-300/60 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xl font-extrabold leading-tight">{formatHM(viewRes.total.worked)} <span className="text-sm font-medium text-ink-500">h · {formatDecimal(viewRes.total.worked)}</span></p>
              {viewRes.pay && <p className="text-sm font-semibold text-brand-700">{money(viewRes.pay.total, view.settings.currency)}{viewRes.total.overtime > 0 && <span className="font-normal text-ink-500"> · {formatHM(viewRes.total.overtime)} OT</span>}</p>}
            </div>
            <Button variant="secondary" onClick={downloadPdf} disabled={busy} ariaLabel="Download PDF">PDF</Button>
            <Button onClick={openShare}>{view.manager ? 'Send' : 'Share'}</Button>
          </div>
        </div>
      )}

      <ShareSheet spec={share} onClose={() => setShare(null)} onDone={showToast} />
      <SignaturePad open={sigOpen} title="Sign your timesheet" onClose={() => setSigOpen(false)} onSave={(png) => { update((t) => ({ ...t, signature: png })); setSigOpen(false); showToast('Signature added'); }} />
      {ts && <TeamLinkModal open={teamOpen} onClose={() => setTeamOpen(false)} ts={ts} onCreate={(spec) => { setTeamOpen(false); setShare(spec); }} />}
      <Toast message={toast} />
    </div>
  );
}

function TeamLinkModal({ open, onClose, ts, onCreate }: { open: boolean; onClose: () => void; ts: Timesheet; onCreate: (s: ShareSpec) => void }) {
  const [employer, setEmployer] = useState(ts.employer);
  const [manager, setManager] = useState('');
  const create = () => {
    const settings = { ...ts.settings, rate: null };
    const url = `${location.origin}/#setup=${encodeSetup({ employer, manager, settings })}`;
    onCreate({
      title: 'Send the team link to your staff',
      subject: `Timesheets${employer ? ' for ' + employer : ''}`,
      url,
      text: `Please fill in your hours with ${SITE_NAME}. It's already set up${employer ? ' for ' + employer : ''}, so tap "Send to ${manager || 'me'}" when you're done:`,
      note: 'The link contains only the company name, your name and the pay rules, not anyone\'s hours. Each person keeps their own timesheet on their phone until they send it to you.',
    });
  };
  return (
    <Modal open={open} onClose={onClose} title="Create a team link">
      <div className="flex flex-col gap-3">
        <Field label="Company" htmlFor="t-co"><input id="t-co" className={inputCls} value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="e.g. Acme Café" /></Field>
        <Field label="Your name (timesheets get sent to you)" htmlFor="t-mg"><input id="t-mg" className={inputCls} value={manager} onChange={(e) => setManager(e.target.value)} placeholder="e.g. Sam" /></Field>
        <p className="text-sm text-ink-700">Your current settings are included: <strong>{ts.settings.period}</strong>, week starting <strong>{WEEKDAYS[ts.settings.weekStart]}</strong>, <strong>{PRESET_LABELS[ts.settings.preset][0].toLowerCase()}</strong>{ts.settings.rounding ? `, rounding to ${ts.settings.rounding} min` : ''}. Pay rates are not included.</p>
        <Button onClick={create} disabled={!manager.trim()}>Create link</Button>
      </div>
    </Modal>
  );
}
