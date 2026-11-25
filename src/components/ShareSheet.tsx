import { useState, type ReactNode } from 'react';
import { Button, Modal } from './ui';
import { downloadBlob } from '../lib/download';
import { track } from '../lib/track';

export type ShareSpec = {
  title: string; // modal title
  url: string;
  text: string; // message body; the url is appended unless textIncludesUrl
  textIncludesUrl?: boolean;
  editable?: boolean; // let the user edit the message (coworker invite)
  subject?: string;
  note?: string; // privacy note
  file?: () => Promise<{ blob: Blob; filename: string }>;
  fileLabel?: string;
};

type Props = { spec: ShareSpec | null; onClose: () => void; onDone?: (msg: string) => void; children?: ReactNode };

/** The share sheet used by every loop: native share on phones, explicit channels everywhere. */
export function ShareSheet(props: Props) {
  if (!props.spec) return null;
  // Remount per message so the editable text starts from it immediately (no empty first frame).
  return <Sheet key={props.spec.title + '\n' + props.spec.text} {...props} spec={props.spec} />;
}

function Sheet({ spec, onClose, onDone, children }: Props & { spec: ShareSpec }) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(spec.text);
  const full = spec.textIncludesUrl ? text : `${text}\n${spec.url}`;
  const enc = encodeURIComponent;
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;
  const copy = async (value: string, msg: string) => {
    track('share_link_copied');
    try { await navigator.clipboard.writeText(value); onDone?.(msg); }
    catch { window.prompt('Copy this:', value); }
  };
  const native = async () => {
    try {
      await navigator.share(spec.textIncludesUrl ? { title: spec.subject ?? spec.title, text } : { title: spec.subject ?? spec.title, text, url: spec.url });
      onClose();
    } catch { /* cancelled */ }
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
        onDone?.('Downloaded. Attach it to your message.');
      }
    } finally { setBusy(false); }
  };
  const channel = 'flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-ink-100 px-3 font-semibold text-ink-900 hover:bg-ink-300/50';
  return (
    <Modal open title={spec.title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {children}
        {spec.editable && (
          <>
            <label htmlFor="share-text" className="text-sm font-medium text-ink-700">Message (you can edit it)</label>
            <textarea id="share-text" rows={4} value={text} onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-ink-300 p-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
          </>
        )}
        {canNative && <Button onClick={native} className="w-full">Share…</Button>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => copy(spec.url, 'Link copied')} className={channel}>Copy link</button>
          <a className={channel} href={`https://wa.me/?text=${enc(full)}`} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp">WhatsApp</a>
          <a className={channel} href={`mailto:?subject=${enc(spec.subject ?? spec.title)}&body=${enc(full)}`} data-testid="share-email">Email</a>
          <a className={channel} href={`sms:?&body=${enc(full)}`} data-testid="share-sms">Text message</a>
        </div>
        <button onClick={() => copy(full, 'Message copied')} className="min-h-[44px] rounded-xl text-sm font-semibold text-brand-700 hover:bg-brand-50">Copy message text</button>
        {spec.file && <Button variant="secondary" onClick={sendFile} disabled={busy} className="w-full">{busy ? 'Preparing…' : spec.fileLabel ?? 'Send as PDF file'}</Button>}
        <label className="text-xs font-medium text-ink-500" htmlFor="share-url">Link</label>
        <input id="share-url" readOnly value={spec.url} onFocus={(e) => e.currentTarget.select()} className="w-full truncate rounded-lg border border-ink-300 bg-ink-100 px-3 py-2 text-xs text-ink-700" />
        {spec.note && <p className="text-xs leading-relaxed text-ink-500">{spec.note}</p>}
      </div>
    </Modal>
  );
}
