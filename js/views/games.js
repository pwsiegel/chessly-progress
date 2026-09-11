/**
 * Games: the play itself, in two readings.
 *
 * The recency list answers "how have the last games gone"; the deviation list
 * answers "where do I keep leaving prep". Both are the same games seen from a
 * different angle, so one global toggle switches between them here and on a
 * course page.
 */
import { state, courseById } from '../data.js';
import { esc, el, gameLinks, dateOf, listToggle, paginated } from '../ui.js';
import { listMode } from '../prefs.js';
import { deviationTable } from './deviations.js';

export const PAGE = 50;

// Who left the course line, and where: the move it happened on, or how deep the
// line ran when nobody left it. The colour is the result, always, so a column
// scan answers "which losses were still in book".
const RESULT = { win: 'good', loss: 'bad', draw: 'dim' };

function deviation(game) {
  const who = { youDev: 'you', oppDev: 'opp' }[game.category];
  if (!who) return `none (${game.depth} move${game.depth === 1 ? '' : 's'})`;
  return game.move ? `${who} (move ${game.move})` : who;
}

/** Most recent first. */
export const byRecency = (games) => [...games].sort((a, b) => b.ts - a.ts);

/** Most played first, then most recent. */
export const byCount = (deviations) => [...deviations].sort(
  (a, b) => b.count - a.count || String(b.date || '').localeCompare(String(a.date || '')));

export function gameTable(rows, { showCourse = false } = {}) {
  const head = `<tr><th>date</th>${showCourse ? '<th>course</th>' : ''}` +
    '<th>opponent</th><th>deviation</th></tr>';

  const body = rows.map((game) => {
    const course = courseById(game.courseId);
    const index = state.account.games.indexOf(game);
    return `<tr class="pick" data-i="${index}">
      <td class="dim">${esc(dateOf(game.ts))}</td>
      ${showCourse ? `<td>${esc(course ? course.name : '?')}</td>` : ''}
      <td class="links">${gameLinks([game])}</td>
      <td class="${RESULT[game.result] || 'dim'}">${esc(deviation(game))}</td>
    </tr>`;
  }).join('');

  const table = el(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  table.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const tr = e.target.closest('tr[data-i]');
    if (tr) location.hash = `#/game/${tr.dataset.i}`;
  });
  return table;
}

/** One page's worth of whichever list the toggle selects. */
export function modeList(games, deviations, size, { showCourse = false } = {}) {
  const games_ = listMode() === 'games';
  const rows = games_ ? byRecency(games) : byCount(deviations);
  if (!rows.length) {
    return el(`<p class="empty">No ${games_ ? 'games' : 'deviations'} here.</p>`);
  }
  return paginated(rows, size, (page) => (games_
    ? gameTable(page, { showCourse })
    : deviationTable(page, { showCourse, showStudy: !showCourse })));
}

export function renderList() {
  const games = listMode() === 'games';
  const node = el(`<div>
    <a class="back" href="#/">&larr; back</a>
    <h1>Games</h1>
    <p class="sub">${games
      ? 'Every game analyzed against the prep, most recent first.'
      : 'Every position where I left the course line, most played first.'}</p>
    <div id="toggle"></div>
    <div id="list"></div>
  </div>`);

  node.querySelector('#toggle').replaceChildren(listToggle());
  node.querySelector('#list').replaceChildren(
    modeList(state.account.games, state.account.deviations, PAGE, { showCourse: true }));
  return node;
}
