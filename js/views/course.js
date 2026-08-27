/** One course: progress, chapter breakdown, and its deviations. */
import { state, courseBySlug, progressFor, gamesAt } from '../data.js';
import { esc, metric, checks, gameCount, categoryStats, gameLists, el } from '../ui.js';
import { deviationTable } from './deviations.js';

export function render({ slug }) {
  const course = courseBySlug(slug);
  if (!course) return el('<p class="error">No such course.</p>');
  const p = progressFor(course.id);
  if (!p) return el('<p class="error">No progress data for this course.</p>');

  const node = el(`<div>
    <a class="back" href="#/">&larr; all courses</a>
    <div class="row"><h1>${esc(course.name)} ${gameCount(p.games)}</h1>${checks(p)}</div>
    ${metric('wins', p.courseWins, state.meta.settings.courseTarget)}
    ${metric('chapters', p.chaptersComplete, p.totalChapters)}
    ${state.local ? `<div class="toolbar">
      <a class="action" href="#/course/${esc(course.slug)}/variations"
         style="text-decoration:none">Variations &amp; drills &rarr;</a></div>` : ''}
    <div id="chapters"></div>
    <div id="devs"></div>
  </div>`);

  const chapters = node.querySelector('#chapters');
  for (const chapter of course.chapters) {
    const stats = p.chapters[chapter.id];
    if (!stats) continue;
    const block = el(`<div class="chapter">
      <div class="row">
        <h3>Ch ${chapter.num} &middot; ${esc(chapter.name)} ${gameCount(stats.games)}</h3>
        <span class="count">${stats.won} / ${state.meta.settings.chapterTarget}</span>
        ${stats.complete ? '<span class="check">&#10003;</span>' : ''}
      </div>
      <div class="stats">${categoryStats(stats.byCategory)}</div>
      ${gameLists(stats.byCategory, gamesAt)}
      <div class="chdevs"></div>
    </div>`);
    const rows = state.account.deviations.filter(
      (d) => d.courseId === course.id && d.chapters.includes(chapter.num));
    if (rows.length) {
      block.querySelector('.chdevs').appendChild(
        deviationTable(rows, { showCourse: false, showStudy: true }));
    }
    chapters.appendChild(block);
  }

  const rows = state.account.deviations.filter((d) => d.courseId === course.id);
  if (rows.length) {
    const holder = node.querySelector('#devs');
    holder.innerHTML = '<h2>All deviations in this course</h2>';
    holder.appendChild(deviationTable(rows, { showCourse: false, showStudy: true }));
  }
  return node;
}
