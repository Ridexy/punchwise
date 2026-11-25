import { addDays, formatDate, formatHM } from './time';
import type { PeriodResult } from './time';
import { SITE_HOST, SITE_NAME } from '../site';

export type CardMode = 'exact' | 'general';
export type CardInput = { startDate: string; days: number; res: PeriodResult; mode: CardMode };

/** Headline + stats for the card. Never includes names, employer, rate or pay. */
export function cardContent({ startDate, days, res, mode }: CardInput) {
  const biweekly = days > 7;
  const hasOT = res.total.overtime + res.total.double > 0;
  const period = `${formatDate(startDate)} – ${formatDate(addDays(startDate, days - 1))}`;
  const kicker = biweekly ? 'My two-week total' : 'My week';
  if (mode === 'general') {
    return { kicker: biweekly ? 'Two weeks done' : 'Week done', headline: hasOT ? 'I calculated my overtime' : 'I calculated my hours', stats: [] as [string, string][], period: '' };
  }
  const stats: [string, string][] = [['Regular', formatHM(res.total.regular)]];
  if (hasOT) stats.push(['Overtime', formatHM(res.total.overtime + res.total.double)]);
  if (res.total.breaks) stats.push(['Breaks', formatHM(res.total.breaks)]);
  return { kicker, headline: `${formatHM(res.total.worked)} hours`, stats, period };
}

export function cardSummaryText(input: CardInput, url: string) {
  const c = cardContent(input);
  const line = input.mode === 'general'
    ? `${c.headline} with ${SITE_NAME}.`
    : `${c.kicker}: ${c.headline}${c.stats.length > 1 ? ` (${c.stats.map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ')})` : ''}.`;
  return `${line} Calculate your own hours for free: ${url}`;
}

/** Draws a 1080x1080 branded PNG in the browser. */
export async function drawCard(input: CardInput): Promise<Blob> {
  const c = cardContent(input);
  const S = 1080;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  const font = (w: number, px: number) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const grad = g.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e3a8a');
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  // brand mark
  const mark = (x: number, y: number, r: number) => {
    g.fillStyle = '#2563eb'; roundRect(g, x, y, r * 2, r * 2, r * 0.5); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = r * 0.16; g.lineCap = 'round';
    g.beginPath(); g.arc(x + r, y + r, r * 0.56, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x + r, y + r * 0.69); g.lineTo(x + r, y + r * 1.03); g.lineTo(x + r * 1.22, y + r * 1.15); g.stroke();
  };
  mark(90, 90, 38);
  g.fillStyle = '#fff'; g.font = font(800, 44); g.textBaseline = 'middle';
  g.fillText(SITE_NAME, 182, 128);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#93c5fd'; g.font = font(700, 46); g.fillText(c.kicker.toUpperCase(), 90, 330);
  g.fillStyle = '#fff';
  let size = input.mode === 'general' ? 104 : 170;
  g.font = font(800, size);
  while (g.measureText(c.headline).width > S - 180 && size > 60) { size -= 6; g.font = font(800, size); }
  if (input.mode === 'general') wrapText(g, c.headline, 90, 470, S - 180, size * 1.1);
  else g.fillText(c.headline, 90, 500);
  if (c.period) { g.fillStyle = '#cbd5e1'; g.font = font(500, 40); g.fillText(c.period, 90, 580); }
  // stat chips
  let x = 90;
  for (const [k, v] of c.stats) {
    const w = 270;
    g.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(g, x, 650, w, 150, 28); g.fill();
    g.fillStyle = '#cbd5e1'; g.font = font(600, 32); g.fillText(k, x + 32, 705);
    g.fillStyle = '#fff'; g.font = font(800, 58); g.fillText(v, x + 32, 775);
    x += w + 24;
  }
  // CTA footer
  g.fillStyle = '#fff'; roundRect(g, 90, 880, S - 180, 110, 55); g.fill();
  g.fillStyle = '#1d4ed8'; g.font = font(800, 40); g.textAlign = 'center';
  g.fillText('Calculate your own hours for free', S / 2, 935);
  g.fillStyle = '#475569'; g.font = font(600, 30); g.fillText(SITE_HOST, S / 2, 975);
  g.textAlign = 'left';
  return await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw image'))), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
}
