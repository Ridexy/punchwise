// Renders PNG icons and the Open Graph image from inline SVG/HTML with headless Chromium.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const mark = (size, pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${32 + 2 * pad} ${32 + 2 * pad}">
<rect x="${-pad}" y="${-pad}" width="${32 + 2 * pad}" height="${32 + 2 * pad}" rx="${pad ? 0 : 7}" fill="#1d4ed8"/>
<circle cx="16" cy="16" r="9" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M16 11v5.5l3.5 2" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, ...(out.endsWith('.jpg') ? { type: 'jpeg', quality: 85 } : {}) });
}
await shot(mark(192), 192, 192, 'public/icons/icon-192.png');
await shot(mark(512), 512, 512, 'public/icons/icon-512.png');
await shot(mark(512, 6), 512, 512, 'public/icons/icon-maskable-512.png');
await shot(mark(180, 3), 180, 180, 'public/icons/apple-touch-icon.png');
await shot(`<div style="width:1200px;height:630px;background:linear-gradient(135deg,#0f172a,#172554);color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box">
  <div style="display:flex;align-items:center;gap:20px">${mark(84)}<span style="font-size:54px;font-weight:800">HourTally</span></div>
  <div style="font-size:66px;font-weight:800;line-height:1.1;margin-top:40px">Time card calculator<br>with breaks &amp; overtime</div>
  <div style="font-size:30px;opacity:.8;margin-top:28px">Free · No sign-up · Send a signed timesheet PDF</div></div>`, 1200, 630, 'public/og.jpg');
await browser.close();
console.log('icons written');
