import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Toast } from '../components/ui';
import { useToast } from '../components/useToast';
import { periodLabel } from '../components/Calculator';
import { deleteSheet, exportBackup, importBackup, listSheets, memoryOnly, saveSheet, setMeta } from '../lib/db';
import { downloadBlob } from '../lib/download';
import { computeSheet, nextPeriodCopy, newId, type Timesheet } from '../lib/model';
import { formatDecimal, formatHM } from '../lib/time';

export default function Saved() {
  const [sheets, setSheets] = useState<Timesheet[] | null>(null);
  const [toast, showToast] = useToast();
  const file = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const reload = () => listSheets().then(setSheets);
  useEffect(() => { reload(); }, []);

  const open = async (t: Timesheet) => { await setMeta('currentId', t.id); nav('/'); };
  const dup = async (t: Timesheet, next: boolean) => {
    const copy = next ? nextPeriodCopy(t) : { ...t, id: newId(), updatedAt: Date.now() };
    await saveSheet(copy);
    showToast(next ? 'Copied to the next period' : 'Duplicated');
    reload();
  };
  const del = async (t: Timesheet) => {
    if (!confirm(`Delete the timesheet for ${periodLabel(t)}? This cannot be undone.`)) return;
    await deleteSheet(t.id);
    reload();
  };
  const backup = async () => {
    const b = await exportBackup();
    downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `hourtally-backup-${b.exportedAt.slice(0, 10)}.json`);
  };
  const restore = async (f: File) => {
    try { const n = await importBackup(await f.text()); showToast(`Restored ${n} timesheet${n === 1 ? '' : 's'}`); reload(); }
    catch (e) { showToast((e as Error).message || 'Could not read that file'); }
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">My timesheets</h1>
      <p className="mb-4 mt-2 text-ink-700">Saved on this device only. Clearing your browser data or uninstalling the browser deletes them, so download a backup now and then.</p>
      {memoryOnly && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">This browser is blocking local storage, so nothing can be saved here.</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => nav('/')}>+ New timesheet</Button>
        <Button variant="secondary" onClick={backup} disabled={!sheets?.length}>Download backup</Button>
        <Button variant="secondary" onClick={() => file.current?.click()}>Restore backup</Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
      </div>
      {sheets === null ? <p className="text-ink-500">Loading…</p> : sheets.length === 0 ? (
        <Card><p className="text-ink-700">No saved timesheets yet. They appear here automatically once you enter some hours.</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {sheets.map((t) => {
            const r = computeSheet(t);
            return (
              <li key={t.id} data-testid="saved-item">
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{periodLabel(t)}</p>
                      <p className="text-sm text-ink-500">{[t.employee, t.employer].filter(Boolean).join(' · ') || 'No name'} · {t.settings.period}</p>
                    </div>
                    <div className="text-right"><p className="text-xl font-extrabold">{formatHM(r.total.worked)}</p><p className="text-xs text-ink-500">{formatDecimal(r.total.worked)} h</p></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button onClick={() => open(t)} className="!min-h-[40px]">Open</Button>
                    <Button variant="ghost" onClick={() => dup(t, true)} className="!min-h-[40px]">Copy to next</Button>
                    <Button variant="ghost" onClick={() => dup(t, false)} className="!min-h-[40px]">Duplicate</Button>
                    <Button variant="ghost" onClick={() => del(t)} className="!min-h-[40px] !text-red-700">Delete</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Toast message={toast} />
    </>
  );
}
