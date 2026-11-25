import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from './ui';

/** Draw a signature with finger, pen or mouse. Produces a trimmed transparent PNG data URL. */
export function SignaturePad({ open, title, onClose, onSave }: { open: boolean; title: string; onClose: () => void; onSave: (png: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    if (!open) return;
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setEmpty(true);
  }, [open]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvas.current!.getContext('2d')!;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setEmpty(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvas.current!.getContext('2d')!;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const up = () => { drawing.current = false; };
  const clear = () => {
    const c = canvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };
  const save = () => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 <= x0 || y1 <= y0) return;
    const pad = 6;
    const out = document.createElement('canvas');
    out.width = x1 - x0 + pad * 2;
    out.height = y1 - y0 + pad * 2;
    out.getContext('2d')!.drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
    onSave(out.toDataURL('image/png'));
  };

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-2 text-sm text-ink-500">Sign with your finger, a stylus or the mouse.</p>
      <canvas ref={canvas} aria-label="Signature drawing area"
        className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-ink-300 bg-white"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
      <p className="mt-2 text-xs text-ink-500">This records your acknowledgement of the hours. It is not a certified electronic signature.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={clear} className="flex-1">Clear</Button>
        <Button onClick={save} disabled={empty} className="flex-1">Use signature</Button>
      </div>
    </Modal>
  );
}
