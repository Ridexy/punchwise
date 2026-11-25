import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Toast } from '../components/ui';
import { ReadOnlyTable, Totals } from '../components/Summary';
import { SignaturePad } from '../components/SignaturePad';
import { useToast } from '../components/useToast';
import { periodLabel, pdfFileFor } from '../components/Calculator';
import { decodeTimesheet, hashValue } from '../lib/share';
import { saveSheet, setMeta } from '../lib/db';
import { downloadBlob } from '../lib/download';
import { computeSheet, type Timesheet } from '../lib/model';
import { SITE_NAME } from '../site';

export default function View() {
  const [ts, setTs] = useState<Timesheet | null | 'invalid'>(null);
  const [supSig, setSupSig] = useState<string | null>(null);
  const [sigOpen, setSigOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const nav = useNavigate();

  useEffect(() => {
    const p = hashValue(location.hash, 'd');
    setTs((p && decodeTimesheet(p)) || 'invalid');
  }, []);

  if (ts === null) return <p className="py-10 text-center text-ink-500">Opening timesheet…</p>;
  if (ts === 'invalid') return (
    <Card>
      <h1 className="text-2xl font-bold">This timesheet link is incomplete</h1>
      <p className="mt-2 text-ink-700">The link may have been cut off when it was copied. Ask the sender to share it again, or send the PDF instead.</p>
      <Link to="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-brand-600 px-4 font-semibold text-white">Open the time card calculator</Link>
    </Card>
  );

  const res = computeSheet(ts);
  const pdf = async () => {
    setBusy(true);
    try { const { blob, filename } = await pdfFileFor(ts, supSig); downloadBlob(blob, filename); showToast('PDF downloaded'); } finally { setBusy(false); }
  };
  const csv = async () => {
    const { timesheetCsv } = await import('../lib/csv');
    downloadBlob(new Blob([timesheetCsv(ts)], { type: 'text/csv;charset=utf-8' }), `timesheet-${ts.startDate}.csv`);
  };
  const editCopy = async () => {
    await saveSheet(ts);
    await setMeta('currentId', ts.id);
    nav('/');
  };

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Shared timesheet</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{ts.employee || 'Timesheet'}</h1>
      <p className="mb-4 mt-1 text-ink-700">{ts.employer && <>{ts.employer} · </>}{periodLabel(ts)}</p>
      <div className="flex flex-col gap-4">
        <Card><Totals ts={ts} res={res} /></Card>
        <Card><ReadOnlyTable ts={ts} /></Card>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Approve and keep a copy</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => setSigOpen(true)} variant="secondary">{supSig ? 'Re-sign as supervisor' : 'Sign as supervisor'}</Button>
            <Button onClick={pdf} disabled={busy}>{busy ? 'Creating PDF…' : 'Download PDF'}</Button>
            <Button onClick={csv} variant="secondary">Download CSV</Button>
            <Button onClick={editCopy} variant="ghost">Edit a copy</Button>
          </div>
          {supSig && <img src={supSig} alt="Supervisor signature" className="mt-3 h-10 object-contain" />}
          <p className="mt-3 text-xs text-ink-500">This is a user-generated calculation, not an official payroll approval. It was made from the link you opened: nothing was uploaded, and the hours are inside the link itself. The sender chose what to include. The employee's drawn signature is only in their PDF.</p>
        </Card>
        {/* Loop 1 -> 2: convert the receiving manager */}
        <Card className="bg-gradient-to-br from-ink-900 to-brand-900 text-white ring-0">
          <h2 className="text-lg font-bold">Get your whole team's timesheets like this</h2>
          <p className="mt-1 text-sm text-white/80">Create a free team link with your pay period and overtime rule. Your staff fill in their hours on their phones and send them to you, already totalled. No accounts, no app to install.</p>
          <Link to="/#team" className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 font-semibold text-ink-900 hover:bg-white/90">Create a team link</Link>
        </Card>
        <p className="text-center text-sm text-ink-500">Made with <Link to="/" className="font-semibold text-brand-700 underline">{SITE_NAME}</Link>, a free time card calculator. <Link to="/" className="underline">Make your own in a minute.</Link></p>
      </div>
      <SignaturePad open={sigOpen} title="Supervisor signature" onClose={() => setSigOpen(false)} onSave={(p) => { setSupSig(p); setSigOpen(false); showToast('Signature added to the PDF'); }} />
      <Toast message={toast} />
    </>
  );
}
