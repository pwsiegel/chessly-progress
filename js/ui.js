/** Small shared rendering helpers. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CATEGORIES = [
  ['won', 'won'], ['lost', 'lost'], ['drew', 'drew'],
  ['youDev', 'you deviated'], ['oppDev', 'opp deviated'],
];

export function bar(x, y) {
  const pct = y ? Math.min(100, Math.round((100 * x) / y)) : 0;
  return `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>`;
}

export function metric(label, x, y) {
  return `<div class="metric"><span class="mlabel">${esc(label)}</span>${bar(x, y)}` +
    `<span class="count">${x} / ${y}</span></div>`;
}

export function checks(progress) {
  const n = progress.metAll ? 2 : progress.metCourse ? 1 : 0;
  return n ? `<span class="check">${'&#10003;'.repeat(n)}</span>` : '';
}

export const gameCount = (n) =>
  `<span class="ngames">${n} game${n === 1 ? '' : 's'}</span>`;

export function gameLinks(games) {
  return games.map((g) =>
    `<a class="${esc(g.result === 'win' ? 'won' : g.result === 'loss' ? 'lost' : '')}" ` +
    `href="${esc(g.url)}" target="_blank" rel="noopener">` +
    `${esc(g.opponent)}${g.rating ? ` (${g.rating})` : ''}</a>`).join(' ');
}

export function categoryStats(byCategory) {
  return CATEGORIES.map(([key, label]) =>
    `<span><b>${(byCategory[key] || []).length}</b> ${label}</span>`).join('');
}

export function gameLists(byCategory, resolve) {
  const blocks = CATEGORIES.filter(([key]) => (byCategory[key] || []).length)
    .map(([key, label]) => {
      const games = resolve(byCategory[key]);
      return `<div class="cat"><h4>${label} (${games.length})</h4>` +
        `<div class="links">${gameLinks(games)}</div></div>`;
    }).join('');
  return blocks ? `<details><summary>games</summary>${blocks}</details>` : '';
}

/** Reach probability as a percentage, marked when it is an upper bound. */
export function reachText(v) {
  if (!v.resolved && v.truncated) return '<span class="dim">no data</span>';
  if (v.p === 0) return '<span class="dim">rare</span>';
  const pct = v.p * 100;
  const shown = pct >= 1 ? pct.toFixed(1) : pct.toFixed(2);
  return `${v.truncated ? '≥' : ''}${shown}%`;
}

export function accuracyText(stat) {
  if (!stat || !stat.attempts) return '<span class="dim">—</span>';
  const pct = Math.round((100 * stat.correct) / stat.attempts);
  const cls = pct >= 80 ? 'good' : pct >= 50 ? '' : 'bad';
  return `<span class="${cls}">${stat.correct}/${stat.attempts}</span> ` +
    `<span class="dim">${pct}%</span>`;
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
