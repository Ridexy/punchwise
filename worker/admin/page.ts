/**
 * Admin dashboard page (served by the Worker at /admin). Self-contained: no external scripts,
 * no analytics. All data is rendered with textContent / DOM APIs (referrers and paths are untrusted).
 */
export const ADMIN_CSP = [
  "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'", "connect-src 'self'",
  "img-src data:", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
].join('; ');

export const ADMIN_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Punchwise admin</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f1f5f9; --surface: #ffffff; --ink: #0f172a; --ink-2: #475569; --ink-3: #64748b;
    --line: #e2e8f0; --grid: #eef2f6; --brand: #1d4ed8;
    --series-1: #257de0; --bar: #257de0; --bar-track: #eef2f6;
    --warn-bg: #fffbeb; --warn-ink: #92400e; --warn-line: #fcd34d;
  }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark;
      --bg: #0b1120; --surface: #151c2c; --ink: #e2e8f0; --ink-2: #a3b0c2; --ink-3: #8a97a9;
      --line: #273247; --grid: #1e2738; --brand: #8ab4ff;
      --series-1: #338ced; --bar: #338ced; --bar-track: #1e2738;
      --warn-bg: #2a2110; --warn-ink: #fcd34d; --warn-line: #6b5212; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { background: var(--surface); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
  .bar { display: flex; align-items: center; gap: 12px; min-height: 56px; flex-wrap: wrap; }
  .logo { font-weight: 800; font-size: 18px; margin-right: auto; }
  .logo span { color: var(--brand); }
  .logo small { font-weight: 600; color: var(--ink-3); font-size: 13px; margin-left: 6px; }
  select, button, input { font: inherit; color: inherit; }
  select, input[type=password] { min-height: 40px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 0 10px; }
  button { min-height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); padding: 0 14px; font-weight: 600; cursor: pointer; }
  button.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
  button:focus-visible, select:focus-visible, input:focus-visible, svg:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  main { padding: 20px 0 48px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3); margin: 28px 0 10px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
  .tile .k { font-size: 13px; color: var(--ink-2); font-weight: 600; }
  .tile .v { font-size: 30px; font-weight: 800; letter-spacing: -.02em; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .tile .s { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
  .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .chart-title { font-weight: 700; margin: 0 0 2px; }
  .chart-sub { font-size: 12px; color: var(--ink-3); margin: 0 0 8px; }
  .chart { position: relative; }
  .chart svg { width: 100%; height: auto; display: block; touch-action: none; }
  .tip { position: absolute; pointer-events: none; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 6px 10px; font-size: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.12); white-space: nowrap; display: none; }
  .tip b { display: block; font-size: 15px; font-variant-numeric: tabular-nums; }
  details { margin-top: 8px; font-size: 13px; }
  summary { cursor: pointer; color: var(--brand); font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  th { color: var(--ink-3); font-weight: 600; font-size: 12px; }
  td.n, th.n { text-align: right; }
  .scroll { overflow-x: auto; }
  .list { list-style: none; margin: 0; padding: 0; }
  .list li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; padding: 6px 0; }
  .list .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .list .val { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .list .track { grid-column: 1 / -1; height: 6px; background: var(--bar-track); border-radius: 4px; overflow: hidden; }
  .list .fill { height: 100%; background: var(--bar); border-radius: 4px; min-width: 2px; }
  .note { background: var(--warn-bg); color: var(--warn-ink); border: 1px solid var(--warn-line); border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 10px 0; }
  .note a { color: inherit; }
  .muted { color: var(--ink-3); font-size: 13px; }
  .login { max-width: 420px; margin: 12vh auto 0; }
  .login form { display: grid; gap: 12px; }
  .login label { font-size: 13px; font-weight: 600; color: var(--ink-2); }
  .err { color: #dc2626; font-size: 13px; min-height: 18px; }
  .hidden { display: none !important; }
  .empty { color: var(--ink-3); font-size: 13px; padding: 12px 0; }
</style>
</head>
<body>
<section id="login" class="wrap login">
  <div class="card">
    <p class="logo">Punch<span>wise</span> <small>admin</small></p>
    <form id="login-form">
      <label for="token">Admin token</label>
      <input id="token" type="password" autocomplete="current-password" required minlength="24" />
      <label style="display:flex;gap:8px;align-items:center;font-weight:500"><input id="remember" type="checkbox" /> Remember on this device</label>
      <button class="primary" type="submit">Open dashboard</button>
      <p class="err" id="login-err" role="alert"></p>
    </form>
  </div>
</section>

<div id="app" class="hidden">
  <header><div class="wrap bar">
    <p class="logo">Punch<span>wise</span> <small>admin</small></p>
    <label class="muted" for="range">Range</label>
    <select id="range"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select>
    <button id="refresh" type="button">Refresh</button>
    <button id="logout" type="button">Sign out</button>
  </div></header>
  <main class="wrap">
    <p class="muted" id="status" aria-live="polite">Loading…</p>
    <div id="notes"></div>

    <h2>Traffic</h2>
    <div class="tiles" id="traffic-tiles"></div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><p class="chart-title">Visits per day</p><p class="chart-sub">Cloudflare Web Analytics</p><div class="chart" id="chart-visits"></div></div>
      <div class="card"><p class="chart-title">Calculations per day</p><p class="chart-sub">Completed time-card calculations</p><div class="chart" id="chart-calcs"></div></div>
    </div>

    <h2>Growth loop</h2>
    <div class="tiles" id="growth-tiles"></div>

    <h2>Where visitors come from</h2>
    <div class="grid3">
      <div class="card"><p class="chart-title">Top pages</p><ul class="list" id="list-pages"></ul></div>
      <div class="card"><p class="chart-title">Referrers</p><ul class="list" id="list-referrers"></ul></div>
      <div class="card"><p class="chart-title">Countries</p><ul class="list" id="list-countries"></ul></div>
    </div>

    <h2>Events by source</h2>
    <div class="card scroll"><table id="matrix"></table></div>
    <p class="muted" id="foot" style="margin-top:16px"></p>
  </main>
</div>

<script>
(() => {
  const KEY = 'pw_admin_token';
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, text) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text !== undefined) n.textContent = String(text); return n; };
  const SVG = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs = {}) => { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; };
  const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('en-US'));
  const pct = (v) => (v == null ? '–' : (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%');
  const dayLabel = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const store = () => { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch { return null; } };
  const save = (t, remember) => { try { (remember ? localStorage : sessionStorage).setItem(KEY, t); } catch {} };
  const forget = () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch {} };

  async function load() {
    const token = store();
    if (!token) return showLogin('');
    $('status').textContent = 'Loading…';
    let res;
    try { res = await fetch('/api/admin/stats?days=' + $('range').value, { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' }); }
    catch { $('status').textContent = 'Network error. Try Refresh.'; return; }
    if (res.status === 401) { forget(); return showLogin('That token was not accepted.'); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { showLogin(body.error || ('Error ' + res.status)); return; }
    $('login').classList.add('hidden'); $('app').classList.remove('hidden');
    render(body);
  }
  function showLogin(msg) { $('app').classList.add('hidden'); $('login').classList.remove('hidden'); $('login-err').textContent = msg; $('token').focus(); }

  function tile(parent, k, v, s) {
    const c = el('div', { class: 'card tile' });
    c.append(el('div', { class: 'k' }, k), el('div', { class: 'v' }, v));
    if (s) c.append(el('div', { class: 's' }, s));
    parent.append(c);
  }
  function note(text, href, linkText) {
    const n = el('div', { class: 'note', role: 'status' }, text + ' ');
    if (href) n.append(el('a', { href, target: '_blank', rel: 'noopener' }, linkText));
    $('notes').append(n);
  }

  function lineChart(host, points, label) {
    host.textContent = '';
    if (!points.length) { host.append(el('p', { class: 'empty' }, 'No data yet.')); return; }
    const W = 560, H = 200, L = 40, R = 12, T = 12, B = 26;
    const max = Math.max(0, ...points.map((p) => p.v));
    // Nice ceiling: round max/4 up to a 1-2-2.5-5 step, then take the first multiple at or above max.
    // Small counts (incl. all-zero) get a 0-2-4 axis so the midline label is a whole number.
    let top = 4;
    if (max > 4) {
      const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const stepSize = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((t) => t >= raw) || 10 * mag;
      top = Math.ceil(max / stepSize) * stepSize;
    }
    const x = (i) => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: '0', 'aria-label': label + ': use arrow keys to read values' });
    for (const g of [0, 0.5, 1]) {
      const gy = y(top * g);
      svg.append(sv('line', { x1: L, x2: W - R, y1: gy, y2: gy, stroke: 'var(--grid)', 'stroke-width': 1 }));
      const t = sv('text', { x: L - 6, y: gy + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)' }); const gv = top * g; t.textContent = Number.isInteger(gv) ? fmt(gv) : gv.toFixed(1); svg.append(t);
    }
    const idx = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    for (const i of idx) { const t = sv('text', { x: x(i), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle', 'font-size': 11, fill: 'var(--ink-3)' }); t.textContent = dayLabel(points[i].d); svg.append(t); }
    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    svg.append(sv('path', { d, fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const hair = sv('line', { y1: T, y2: H - B, stroke: 'var(--ink-3)', 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
    const dot = sv('circle', { r: 5, fill: 'var(--series-1)', stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' });
    svg.append(hair, dot);
    const hit = sv('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent' });
    svg.append(hit);
    const tip = el('div', { class: 'tip' });
    let cur = -1;
    const show = (i) => {
      cur = Math.max(0, Math.min(points.length - 1, i));
      const px = x(cur), py = y(points[cur].v);
      for (const n of [hair]) { n.setAttribute('x1', px); n.setAttribute('x2', px); n.setAttribute('visibility', 'visible'); }
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
      tip.textContent = ''; tip.append(el('b', {}, fmt(points[cur].v)), el('span', {}, dayLabel(points[cur].d)));
      tip.style.display = 'block';
      const box = host.getBoundingClientRect(), sc = box.width / W;
      tip.style.left = Math.min(box.width - tip.offsetWidth, Math.max(0, px * sc - tip.offsetWidth / 2)) + 'px';
      tip.style.top = Math.max(0, py * sc - 52) + 'px';
    };
    const hide = () => { hair.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.style.display = 'none'; };
    svg.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const vx = ((e.clientX - r.left) / r.width) * W; show(Math.round(((vx - L) / (W - L - R)) * (points.length - 1))); });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur < 0 ? points.length - 1 : cur + (e.key === 'ArrowRight' ? 1 : -1)); } });
    host.append(svg, tip);
    const det = el('details'); det.append(el('summary', {}, 'Show as table'));
    const tbl = el('table'); const head = el('tr'); head.append(el('th', {}, 'Date'), el('th', { class: 'n' }, label)); tbl.append(head);
    for (const p of points) { const tr = el('tr'); tr.append(el('td', {}, p.d), el('td', { class: 'n' }, fmt(p.v))); tbl.append(tr); }
    det.append(tbl); host.append(det);
  }

  function barList(host, rows) {
    host.textContent = '';
    if (!rows || !rows.length) { host.append(el('li', { class: 'empty' }, 'No data yet.')); return; }
    const max = Math.max(1, ...rows.map((r) => r.count));
    for (const r of rows) {
      const li = el('li', { title: r.label + ': ' + fmt(r.count) });
      const track = el('div', { class: 'track' }); const fill = el('div', { class: 'fill' }); fill.style.width = (100 * r.count / max) + '%'; track.append(fill);
      li.append(el('span', { class: 'name' }, r.label), el('span', { class: 'val' }, fmt(r.count)), track);
      host.append(li);
    }
  }

  const EV = ['calculator_opened','calculation_completed','share_button_clicked','share_link_copied','share_card_downloaded','report_exported','invite_clicked','embed_code_copied'];
  const SRC = ['organic_search','direct','shared_result','coworker_invitation','embedded_calculator','other_referral'];
  const nice = (s) => s.replace(/_/g, ' ');

  function render(s) {
    $('notes').textContent = '';
    const w = s.web, g = s.growth, k = s.kpis || {};
    if (!g.ok) note('Growth events unavailable: ' + (g.error || 'unknown error'));
    if (!w.ok) note('Web Analytics unavailable here: ' + (w.error || 'unknown error') + '. View it in Cloudflare instead:', 'https://dash.cloudflare.com/?to=/:account/web-analytics', 'open Web Analytics');

    const tt = $('traffic-tiles'); tt.textContent = '';
    tile(tt, 'Page views', fmt(w.ok ? w.pageViews : null), 'Web Analytics');
    tile(tt, 'Visits', fmt(w.ok ? w.visits : null), 'Web Analytics');
    tile(tt, 'Calculator opens', fmt(g.ok ? g.totals.calculator_opened : null), 'growth events');
    tile(tt, 'Calculations', fmt(g.ok ? g.totals.calculation_completed : null), 'completed totals');
    tile(tt, 'Reports exported', fmt(g.ok ? g.totals.report_exported : null), 'PDF, CSV, print');

    const gt = $('growth-tiles'); gt.textContent = '';
    for (const key of ['growth', 'shareRate', 'referralConversion', 'inviteConversion', 'actionsPerCalc']) {
      const m = k[key]; if (!m) continue;
      const v = key === 'actionsPerCalc' ? (m.value == null ? '–' : m.value.toFixed(2)) : pct(m.value);
      tile(gt, m.label, v, fmt(m.numerator) + ' / ' + fmt(m.denominator) + ' · ' + m.help);
    }

    lineChart($('chart-visits'), w.ok ? w.daily.map((p) => ({ d: p.date, v: p.visits })) : [], 'Visits');
    lineChart($('chart-calcs'), g.ok ? g.daily.map((p) => ({ d: p.date, v: p.calculations })) : [], 'Calculations');
    barList($('list-pages'), w.ok ? w.pages : []);
    barList($('list-referrers'), w.ok ? w.referrers : []);
    barList($('list-countries'), w.ok ? w.countries : []);

    const t = $('matrix'); t.textContent = '';
    const hr = el('tr'); hr.append(el('th', {}, 'Event')); for (const src of SRC) hr.append(el('th', { class: 'n' }, nice(src))); hr.append(el('th', { class: 'n' }, 'total')); t.append(hr);
    for (const e of EV) {
      const tr = el('tr'); tr.append(el('td', {}, nice(e)));
      for (const src of SRC) tr.append(el('td', { class: 'n' }, g.ok ? fmt(g.matrix[e][src]) : '–'));
      tr.append(el('td', { class: 'n' }, g.ok ? fmt(g.totals[e]) : '–')); t.append(tr);
    }
    $('status').textContent = '';
    $('foot').textContent = 'Last ' + s.days + ' days · updated ' + new Date(s.generatedAt).toLocaleString() + ' · growth counts are corrected for Analytics Engine sampling. Visits are only counted for visitors whose browser loads the Cloudflare beacon (ad blockers reduce this).';
  }

  $('login-form').addEventListener('submit', (e) => { e.preventDefault(); save($('token').value.trim(), $('remember').checked); $('token').value = ''; load(); });
  $('range').addEventListener('change', load);
  $('refresh').addEventListener('click', load);
  $('logout').addEventListener('click', () => { forget(); showLogin('Signed out.'); });
  load();
})();
</script>
</body>
</html>`;
