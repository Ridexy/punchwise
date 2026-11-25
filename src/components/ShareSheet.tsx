import { useState } from 'react';
import { Button, Modal } from './ui';
import { downloadBlob } from '../lib/download';

export type ShareSpec = {
  title: string; // modal title
  url: string;
  text: string; // message body, url appended
  subject?: string;
  note?: string; // privacy warning
  file?: () => Promise<{ blob: Blob; filename: string }>;
};

/** The share sheet used by every loop: native share on phones, explicit channels everywhere. */
export function ShareSheet({ spec, onClose, onDone }: { spec: ShareSpec | null; onClose: () => void; onDone?: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  if (!spec) return null;
  const full = `${spec.text}\n${spec.url}`;
  const enc = encodeURIComponent;
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spec.url);
      onDone?.('Link copied');
    } catch {
      window.prompt('Copy this link:', spec.url);
    }
  };
  const native = async () => {
    try { await navigator.share({ title: spec.subject ?? spec.title, text: spec.text, url: spec.url }); onClose(); } catch { /* cancelled */ }
  };
  const sendFile = async () => {
    if (!spec.file) return;
    setBusy(true);
    try {
      const { blob, filename } = await spec.file();
      const file = new File([blob], filename, { type: blob.type });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: full }).catch(() => {});
      } else {
        downloadBlob(blob, filename);
        onDone?.('PDF downloaded. Attach it to your message.');
      }
    } finally { setBusy(false); }
  };
  const channel = 'flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink-100 px-3 font-semibold text-ink-900 hover:bg-ink-300/50';
  return (
    <Modal open title={spec.title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {canNative && <Button onClick={native} className="w-full">Share…</Button>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className={channel}>Copy link</button>
          <a className={channel} href={`https://wa.me/?text=${enc(full)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className={channel} href={`mailto:?subject=${enc(spec.subject ?? spec.title)}&body=${enc(full)}`}>Email</a>
          <a className={channel} href={`sms:?&body=${enc(full)}`}>Text message</a>
        </div>
        {spec.file && <Button variant="secondary" onClick={sendFile} disabled={busy} className="w-full">{busy ? 'Preparing PDF…' : 'Send as PDF file'}</Button>}
        <label className="text-xs font-medium text-ink-500" htmlFor="share-url">Link</label>
        <input id="share-url" readOnly value={spec.url} onFocus={(e) => e.currentTarget.select()} className="w-full truncate rounded-lg border border-ink-300 bg-ink-100 px-3 py-2 text-xs text-ink-700" />
        {spec.note && <p className="text-xs leading-relaxed text-ink-500">{spec.note}</p>}
      </div>
    </Modal>
  );
}
