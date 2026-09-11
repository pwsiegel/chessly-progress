/**
 * Deviations: where my own games left the prep.
 *
 * The table is the disclosure a public build is allowed to make — my move and
 * the course's move in that position — and is rendered wherever a deviation
 * list appears. A local build adds the board view, which can also show which
 * course variations run through the position and start a drill from them.
 */
import { state, courseById, gamesAt } from '../data.js';
import { esc, gameLinks, moveCount, el } from '../ui.js';
import { markedBoard, variationsThroughAnywhere } from '../lines.js';
import { stepper } from '../stepper.js';
import { createShuffle } from './shuffles.js';

export function deviationTable(rows, { showCourse = false, showStudy = false } = {}) {
  const head = `<tr><th>#</th><th>last</th>${showCourse ? '<th>course</th>' : ''}` +
    `${showStudy ? '<th>study</th>' : ''}<th>at</th><th>you played</th>` +
    `<th>line</th><th>games</th></tr>`;

  const body = rows.map((row) => {
    const course = courseById(row.courseId);
    const index = state.account.deviations.indexOf(row);
    return `<tr class="pick" data-i="${index}">
      <td class="n">${row.count}</td>
      <td class="dim">${esc(row.date || '—')}</td>
      ${showCourse ? `<td>${esc(course ? course.name : '?')}</td>` : ''}
      ${showStudy ? `<td class="dim">${row.studies.length
        ? row.studies.map((s) => `St ${s}`).join(', ') : '—'}</td>` : ''}
      <td>move ${row.move}</td>
      <td class="bad">${esc(row.san || '?')}</td>
      <td class="good">${esc(row.taught.join('/') || '?')}</td>
      <td class="links">${gameLinks(gamesAt(row.games))}</td>
    </tr>`;
  }).join('');

  const table = el(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  table.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const tr = e.target.closest('tr[data-i]');
    if (tr) location.hash = `#/deviation/${tr.dataset.i}`;
  });
  return table;
}

export function renderOne({ index }) {
  const row = state.account.deviations[Number(index)];
  if (!row) return el('<p class="error">No such deviation.</p>');
  const course = courseById(row.courseId);
  const orientation = row.line.length % 2 === 0 ? 'w' : 'b';

  const node = el(`<div>
    <a class="back" href="#/">&larr; back</a>
    <h1>Move ${row.move}: <span class="bad">${esc(row.san)}</span>
      instead of <span class="good">${esc(row.taught.join('/'))}</span></h1>
    <p class="sub">${esc(course ? course.name : '')} &middot;
      played ${row.count} time${row.count === 1 ? '' : 's'} &middot;
      last ${esc(row.date || '—')}</p>
    <div class="split">
      <div class="left"><div class="boardhost"></div>
        <div class="boardbar"><span class="dim">Your move in red,
          the course move in green.</span></div>
      </div>
      <div class="right">
        <h2>Your game to this point</h2>
        <div class="mvs"></div>
        <div class="links">${gameLinks(gamesAt(row.games))}</div>
        <div class="through"></div>
      </div>
    </div>
  </div>`);

  const { sans, at, marks } = markedBoard({
    moves: [...row.line, row.san].join(' '), at: row.line.length + 1, taught: row.taught });
  node.onKey = stepper(node, { sans, at, marks, orientation });

  if (state.local) {
    const groups = variationsThroughAnywhere(row.courseId, row.fen);
    const holder = node.querySelector('.through');
    if (!groups.length) {
      holder.innerHTML = '<h2>Course lines here</h2>' +
        '<p class="empty">No variation passes through this exact position.</p>';
      return node;
    }

    holder.innerHTML = '<h2>Course lines through this position</h2>';
    for (const { course: from, hits } of groups) {
      const foreign = from.id !== row.courseId;
      const block = el(`<div class="card">
        <div class="row">
          <span class="title"><b>${esc(from.name)}</b>
            ${foreign ? '<span class="ngames">reached by transposition</span>' : ''}</span>
          <span class="count">${hits.length} variation${hits.length === 1 ? '' : 's'}</span>
        </div>
        <div class="toolbar">
          <button class="action primary" data-act="drill">Drill these ${hits.length}</button>
        </div>
        <div class="varlist">${hits.map(({ variation }) => `
          <div class="item" data-id="${esc(variation.id)}">
            <span>Ch ${variation.ch} · St ${variation.st} · #${variation.i}</span>
            <span class="dim">${moveCount(variation.sans)} moves</span>
          </div>`).join('')}</div>
      </div>`);

      block.querySelector('[data-act=drill]').addEventListener('click', async () => {
        const shuffle = await createShuffle({
          name: `${row.san} at move ${row.move} — ${from.name}`,
          courseId: from.id,
          variationIds: hits.map((h) => h.variation.id),
        });
        location.hash = `#/drill/${shuffle.id}`;
      });
      block.querySelector('.varlist').addEventListener('click', (e) => {
        const item = e.target.closest('.item');
        if (item) location.hash = `#/course/${from.slug}/review/${item.dataset.id}`;
      });
      holder.appendChild(block);
    }
  }
  return node;
}
