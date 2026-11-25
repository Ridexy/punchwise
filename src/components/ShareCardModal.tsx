import { useEffect, useState } from 'react';
import { Button, Modal } from './ui';
import { cardSummaryText, drawCard, type CardMode } from '../lib/card';
import { downloadBlob } from '../lib/download';
import { REF, track, withRef } from '../lib/track';
import type { PeriodResult } from '../lib/time';

/** Public-safe "my week" card: hours only, never names or pay. */
export function ShareCardModal({ open, onClose, startDate, days, res, onDone }: {
  open: boolean; onClose: () => void; startDate: string; days: number; res: PeriodResult; onDone: (m: string) => void;
}) {
  const [mode, setMode] = useState<CardMode>('exact');
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const homeUrl = withRef(`${location.origin}/`, REF.card);
  const input = { startDate, days, res, mode };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let url = '';
    drawCard({ startDate, days, res, mode }).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setImg({ url, blob });
    }).catch(() => onDone('Could not create the image on this browser'));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [open, mode, startDate, days, res, onDone]);

  if (!open) return null;
  const filename = `hourtally-${days > 7 ? 'two-weeks' : 'my-week'}-${startDate}.png`;
  const shareImage = async () => {
    if (!img) return;
    track('share_card_downloaded');
    const file = new File([img.blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: cardSummaryText(input, homeUrl) }).catch(() => {});
    } else {
      downloadBlob(img.blob, filename);
      onDone('Image downloaded');
    }
  };
  const download = () => { if (img) { track('share_card_downloaded'); downloadBlob(img.blob, filename); onDone('Image downloaded'); } };
  const copyText = async () => {
    track('share_link_copied');
    const t = cardSummaryText(input, homeUrl);
    try { await navigator.clipboard.writeText(t); onDone('Summary copied'); } catch { window.prompt('Copy this:', t); }
  };
  return (
    <Modal open title="Share your week" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="What the card shows">
          {(['exact', 'general'] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}
              className={`min-h-[44px] rounded-xl text-sm font-semibold ${mode === m ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-700'}`}>
              {m === 'exact' ? 'Show my hours' : 'General message'}
            </button>
          ))}
        </div>
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-ink-100">
          {img && <img src={img.url} alt="Preview of your share card" className="h-full w-full" data-testid="card-preview" />}
        </div>
        <p className="text-xs text-ink-500">The card never shows your name, employer, rate or pay.</p>
        <Button onClick={shareImage} disabled={!img}>Share image</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={download} disabled={!img}>Download PNG</Button>
          <Button variant="secondary" onClick={copyText}>Copy summary</Button>
        </div>
      </div>
    </Modal>
  );
}
