import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CtaCalculator, Faq, Field, Prose, inputCls } from '../components/ui';
import { downloadBlob, pdfBlob } from '../lib/download';
import { WEEKDAYS } from '../lib/time';

export default function Printable() {
  const [period, setPeriod] = useState<'weekly' | 'biweekly'>('weekly');
  const [paper, setPaper] = useState<'letter' | 'a4'>('letter');
  const [weekStart, setWeekStart] = useState(0);
  const [employer, setEmployer] = useState('');
  const [employee, setEmployee] = useState('');
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { blankTimesheetPdf } = await import('../lib/pdf');
      const bytes = await blankTimesheetPdf({ period, paper, weekStart, employer, employee });
      downloadBlob(pdfBlob(bytes), `${period}-timesheet-${paper}.pdf`);
    } finally { setBusy(false); }
  };
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Printable Timesheet</h1>
      <p className="mb-5 mt-2 text-ink-700">Download a free blank timesheet PDF to fill in by hand: weekly or biweekly, US Letter or A4, with in and out columns for two shifts a day, breaks, totals and signature lines.</p>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Period" htmlFor="per"><select id="per" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value as 'weekly')}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option></select></Field>
          <Field label="Paper" htmlFor="pap"><select id="pap" className={inputCls} value={paper} onChange={(e) => setPaper(e.target.value as 'letter')}><option value="letter">US Letter</option><option value="a4">A4</option></select></Field>
          <Field label="Week starts on" htmlFor="wst"><select id="wst" className={inputCls} value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></Field>
          <Field label="Company (optional)" htmlFor="pco"><input id="pco" className={inputCls} value={employer} onChange={(e) => setEmployer(e.target.value)} /></Field>
          <Field label="Employee (optional)" htmlFor="pem"><input id="pem" className={inputCls} value={employee} onChange={(e) => setEmployee(e.target.value)} /></Field>
        </div>
        <Button onClick={download} disabled={busy} className="mt-4 w-full">{busy ? 'Creating PDF…' : `Download blank ${period} timesheet (PDF)`}</Button>
        <p className="mt-2 text-xs text-ink-500">Created in your browser. Nothing is uploaded.</p>
      </Card>
      <CtaCalculator text="Rather skip the adding up? Fill it in online and download it already totalled and signed." />
      <Prose>
        <h2>What's on the timesheet</h2>
        <ul>
          <li>Employee, company, period dates, hourly rate and employee ID fields</li>
          <li>One row per day with <strong>two in/out pairs</strong>, for a lunch punch or a split shift</li>
          <li>Break and daily total columns, plus a total hours row</li>
          <li>Boxes for regular hours, overtime hours and gross pay</li>
          <li>Employee and supervisor signature and date lines</li>
        </ul>
        <h2>Tips for filling in a paper timesheet</h2>
        <ul>
          <li>Write times in a consistent format. Use AM/PM or 24-hour, but don't mix them. The <Link to="/military-time-converter/">military time chart</Link> helps if your clock shows 24-hour time.</li>
          <li>Total each day in hours and minutes, then convert to decimal hours for payroll using the <Link to="/time-to-decimal/">minutes to decimal chart</Link>.</li>
          <li>Fill it in at the end of every shift, not at the end of the week.</li>
          <li>Keep a copy or a photo for your own records.</li>
        </ul>
        <h2>Weekly or biweekly?</h2>
        <p>Use the same period as your payroll. Even on a biweekly timesheet, overtime under US federal rules is worked out for each week separately, which is why the biweekly sheet marks the split between week 1 and week 2.</p>
      </Prose>
      <Faq items={[
        ['Is this timesheet free to use and copy?', <p>Yes. Download, print and copy it as often as you like, for personal or business use.</p>],
        ['Can I fill it in on my phone instead?', <p>Yes. The <Link to="/">time card calculator</Link> produces the same kind of timesheet with everything added up, and you can send it to your manager.</p>],
        ['Which paper size should I choose?', <p>US Letter in the US and Canada. A4 almost everywhere else.</p>],
      ]} />
    </>
  );
}
