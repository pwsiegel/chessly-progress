/**
 * The curation screen: every variation of a course with the two numbers that
 * decide what is worth drilling — how often I actually face it, and how well I
 * know it — and the controls to turn a selection into a drill shuffle.
 */
import { courseBySlug, variationsFor, linesFor } from '../data.js';
import { esc, reachText, accuracyText, moveCount, el } from '../ui.js';
import { listShuffles, accuracy } from '../store.js';
import { createShuffle } from './shuffles.js';

const COLUMNS = [
  ['label', 'variation'],
  ['moves', 'first moves'],
  ['length', 'moves'],
  ['p', 'reach'],
  ['acc', 'accuracy'],
  ['last', 'last drilled'],
];

const value = (v, stats, key) => {
  const stat = stats[v.id];
  switch (key) {
    case 'label': return v.ch * 1e6 + v.st * 1e3 + v.i;
    case 'moves': return v.sans.join(' ');
    case 'length': return v.sans.length;
    case 'p': return v.p;
    case 'acc': return stat && stat.attempts ? stat.correct / stat.attempts : -1;
    case 'last': return stat && stat.last ? stat.last : '';
    default: return 0;
  }
};

export async function render({ slug }) {
  const course = courseBySlug(slug);
  if (!course) return el('<p class="error">No such course.</p>');
  const lines = linesFor(course.id);
  if (!lines) return el('<p class="error">This build has no course lines.</p>');

  const variations = variationsFor(course.id);
  let stats = accuracy(await listShuffles());
  const selected = new Set();
  let sortKey = 'label';
  let ascending = true;
  let chapterFilter = 'all';
  let windowSize = 0;

  const node = el(`<div>
    <a class="back" href="#/course/${esc(course.slug)}">&larr; back</a>
    <h1>${esc(course.name)}</h1>
    <p class="sub">${variations.length} variations.
      <b>Reach</b> is how often this line occurs at 1800–2200 given the opening;
      <b>accuracy</b> counts only finished shuffles.</p>
    <div class="toolbar">
      <label>chapter
        <select id="chapter">
          <option value="all">all</option>
          ${lines.chapters.map((c) => `<option value="${c.num}">Ch ${c.num} · ${esc(c.name)}</option>`).join('')}
        </select>
      </label>
      <label>accuracy over
        <select id="window">
          <option value="0">all attempts</option>
          <option value="3">last 3</option>
          <option value="5">last 5</option>
          <option value="10">last 10</option>
        </select>
      </label>
      <span class="spacer"></span>
      <button class="action" id="all">Select shown</button>
      <button class="action" id="none">Clear</button>
      <button class="action" id="worst">Worst 15</button>
      <button class="action" id="common">Most common 15</button>
      <button class="action primary" id="drill" disabled>Drill selected</button>
    </div>
    <table><thead><tr>
      <th style="width:1%"></th>
      ${COLUMNS.map(([key, title]) =>
        `<th class="sortable" data-key="${key}">${title}</th>`).join('')}
    </tr></thead><tbody id="rows"></tbody></table>
  </div>`);

  const rowsEl = node.querySelector('#rows');
  const drillButton = node.querySelector('#drill');

  const shown = () => variations.filter(
    (v) => chapterFilter === 'all' || String(v.ch) === chapterFilter);

  function draw() {
    const list = shown().sort((a, b) => {
      const [x, y] = [value(a, stats, sortKey), value(b, stats, sortKey)];
      const cmp = x < y ? -1 : x > y ? 1 : 0;
      return ascending ? cmp : -cmp;
    });
    rowsEl.innerHTML = list.map((v) => {
      const stat = stats[v.id];
      return `<tr data-id="${esc(v.id)}">
        <td><input type="checkbox" ${selected.has(v.id) ? 'checked' : ''}></td>
        <td><a href="#/course/${esc(course.slug)}/review/${esc(v.id)}"
              >Ch ${v.ch} · St ${v.st} · #${v.i}</a></td>
        <td class="moves-preview">${esc(v.sans.slice(0, 8).join(' '))}…</td>
        <td class="num dim">${moveCount(v.sans)}</td>
        <td class="num">${reachText(v)}</td>
        <td class="num">${accuracyText(stat)}</td>
        <td class="num dim">${stat && stat.last ? esc(stat.last.slice(0, 10)) : '—'}</td>
      </tr>`;
    }).join('');
    drillButton.disabled = selected.size === 0;
    drillButton.textContent = selected.size
      ? `Drill selected (${selected.size})` : 'Drill selected';
  }

  const pickTop = (key, n, ascendingOrder) => {
    selected.clear();
    [...shown()]
      .sort((a, b) => {
        const [x, y] = [value(a, stats, key), value(b, stats, key)];
        return ascendingOrder ? (x < y ? -1 : x > y ? 1 : 0) : (x > y ? -1 : x < y ? 1 : 0);
      })
      .slice(0, n)
      .forEach((v) => selected.add(v.id));
    draw();
  };

  rowsEl.addEventListener('change', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    if (e.target.checked) selected.add(row.dataset.id);
    else selected.delete(row.dataset.id);
    drillButton.disabled = selected.size === 0;
    drillButton.textContent = selected.size
      ? `Drill selected (${selected.size})` : 'Drill selected';
  });

  node.querySelector('thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-key]');
    if (!th) return;
    if (sortKey === th.dataset.key) ascending = !ascending;
    else { sortKey = th.dataset.key; ascending = th.dataset.key !== 'p'; }
    draw();
  });

  node.querySelector('#chapter').addEventListener('change', (e) => {
    chapterFilter = e.target.value;
    draw();
  });
  node.querySelector('#window').addEventListener('change', async (e) => {
    windowSize = Number(e.target.value);
    stats = accuracy(await listShuffles(), windowSize);
    draw();
  });
  node.querySelector('#all').addEventListener('click', () => {
    shown().forEach((v) => selected.add(v.id));
    draw();
  });
  node.querySelector('#none').addEventListener('click', () => {
    selected.clear();
    draw();
  });
  node.querySelector('#worst').addEventListener('click', () => pickTop('acc', 15, true));
  node.querySelector('#common').addEventListener('click', () => pickTop('p', 15, false));

  drillButton.addEventListener('click', async () => {
    const chapterLabel = chapterFilter === 'all' ? 'all chapters' : `Ch ${chapterFilter}`;
    const shuffle = await createShuffle({
      name: `${course.name} — ${chapterLabel} (${selected.size})`,
      courseId: course.id,
      variationIds: [...selected],
    });
    location.hash = `#/drill/${shuffle.id}`;
  });

  draw();
  return node;
}
