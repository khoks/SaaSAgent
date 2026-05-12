/**
 * Bundled eval dashboard — Phase 6 / ADR-037.
 *
 * A self-contained HTML page served by the runtime at GET /dashboard. Renders
 * per-capability eval metrics from /evals/capabilities live in the browser.
 * No build step, no React dependency in the runtime package — vanilla JS that
 * polls the REST endpoints. The "bundled SPA" promised in INIT-002 grows out
 * of this in v1; for MVP this is the visible deliverable that meets the
 * Phase 6 gate.
 *
 * Design goals:
 *   • Zero dependencies in the runtime package (HTML/CSS/vanilla JS).
 *   • Single file, no template engine.
 *   • Auto-refresh every 3 seconds so devs can drive load through the demo
 *     and watch the metrics move.
 *   • Worst-first ordering — capabilities with the lowest overallScore at
 *     the top of the page so reviewers see what to fix.
 */

export function renderDashboardHtml(runtimeOrigin: string): string {
  // Embed the origin so the page knows where to fetch from when served from
  // a non-default port. Caller passes the runtime's `http://host:port`.
  const safeOrigin = JSON.stringify(runtimeOrigin);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SaaSAgent — Eval dashboard</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #0e1116; color: #c9d1d9; min-height: 100vh; padding: 24px; font-size: 14px; }
  header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .sub { color: #8b949e; font-size: 12px; }
  .meta { color: #8b949e; font-size: 12px; }
  .meta strong { color: #c9d1d9; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 12px; }
  .empty { color: #8b949e; padding: 60px 20px; text-align: center; font-style: italic; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px; }
  .card .row1 { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .card .name { font-weight: 700; font-size: 14px; word-break: break-all; }
  .card .kind { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 10px; background: #30363d; color: #c9d1d9; }
  .kind.skill { background: #1f6feb40; color: #58a6ff; }
  .kind.tool { background: #d29922a0; color: #ffd33d; }
  .kind.subagent { background: #a371f7a0; color: #d2a8ff; }
  .score { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .score.good { color: #56d364; }
  .score.warn { color: #e3b341; }
  .score.bad  { color: #f85149; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 8px 0; font-size: 11px; color: #8b949e; }
  .metrics .v { color: #c9d1d9; font-weight: 600; font-size: 13px; }
  .checks { margin-top: 8px; border-top: 1px solid #30363d; padding-top: 8px; }
  .check-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; font-size: 12px; padding: 3px 0; }
  .check-name { color: #c9d1d9; }
  .check-sample { color: #6e7681; font-size: 10px; }
  .bar { width: 80px; height: 6px; background: #30363d; border-radius: 3px; overflow: hidden; }
  .bar > .fill { height: 100%; background: #56d364; transition: width 180ms; }
  .fill.warn { background: #e3b341; }
  .fill.bad  { background: #f85149; }
  .updated { color: #8b949e; font-size: 11px; margin-top: 8px; }
</style>
</head>
<body>
<header>
  <div>
    <h1>SaaSAgent — Eval dashboard</h1>
    <div class="sub">Phase 6 / ADR-037 — auto-generated per-capability quality metrics</div>
  </div>
  <div class="meta" id="meta"></div>
</header>
<div id="root" class="grid"><div class="empty">Loading capability reports…</div></div>
<script>
(function () {
  const RUNTIME = ${safeOrigin};
  const root = document.getElementById('root');
  const meta = document.getElementById('meta');
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function classFor(score) { return score >= 0.85 ? 'good' : score >= 0.6 ? 'warn' : 'bad'; }
  function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }
  function fmtMs(n) { return n + ' ms'; }
  function renderCard(report) {
    const overall = report.overallScore;
    const overallStr = overall === null ? '—' : fmtPct(overall);
    const scoreClass = overall === null ? '' : classFor(overall);
    const checks = Object.entries(report.perCheck).map(function (entry) {
      const cName = entry[0];
      const c = entry[1];
      const fillW = (clamp(c.mean) * 100).toFixed(0);
      const cls = classFor(c.mean);
      return '<div class="check-row">'
        + '<span class="check-name">' + cName + '</span>'
        + '<span class="bar"><span class="fill ' + cls + '" style="width: ' + fillW + '%"></span></span>'
        + '<span class="check-sample">' + (c.mean * 100).toFixed(0) + '% · n=' + c.sampleSize + '</span>'
        + '</div>';
    }).join('');
    return '<div class="card">'
      + '<div class="row1">'
      +   '<span class="name">' + report.name + '</span>'
      +   '<span class="kind ' + report.kind + '">' + report.kind + '</span>'
      + '</div>'
      + '<div class="score ' + scoreClass + '">' + overallStr + '</div>'
      + '<div class="metrics">'
      +   '<div><div>success</div><div class="v">' + fmtPct(report.successRate) + '</div></div>'
      +   '<div><div>p50 lat</div><div class="v">' + fmtMs(report.medianLatencyMs) + '</div></div>'
      +   '<div><div>p95 lat</div><div class="v">' + fmtMs(report.p95LatencyMs) + '</div></div>'
      + '</div>'
      + '<div class="checks">' + checks + '</div>'
      + '<div class="updated">n = ' + report.totalInvocations + ' invocations · last seen '
      +   new Date(report.lastSeenAt || Date.now()).toLocaleTimeString()
      + '</div>'
      + '</div>';
  }
  async function tick() {
    try {
      const res = await fetch(RUNTIME + '/evals/capabilities');
      const body = await res.json();
      const reports = body.reports || [];
      meta.innerHTML = '<strong>' + reports.length + '</strong> capabilities tracked · refreshed ' + new Date().toLocaleTimeString();
      if (reports.length === 0) {
        root.innerHTML = '<div class="empty">No capability invocations recorded yet. Drive the agent through the host page to populate.</div>';
        return;
      }
      root.innerHTML = reports.map(renderCard).join('');
    } catch (err) {
      meta.innerHTML = '<span style="color:#f85149">fetch error: ' + err + '</span>';
    }
  }
  tick();
  setInterval(tick, 3000);
})();
</script>
</body>
</html>`;
}
