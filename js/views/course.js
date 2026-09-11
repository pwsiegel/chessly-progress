/** One course: progress, chapter breakdown, and the games or deviations behind it. */
import { state, courseBySlug, progressFor, gamesAt } from '../data.js';
import { esc, metric, checks, gameCount, categoryStats, listToggle, el } from '../ui.js';
import { modeList, PAGE } from './games.js';

const CHAPTER_PAGE = 10;

const gamesIn = (byCategory) =>
  gamesAt(Object.values(byCategory || {}).flat());

export function render({ slug }) {
  const course = courseBySlug(slug);
  if (!course) return el('<p class="error">No such course.</p>');
  const p = progressFor(course.id);
  if (!p) return el('<p class="error">No progress data for this course.</p>');

  const deviations = state.account.deviations.filter((d) => d.courseId === course.id);
  const node = el(`<div>
    <a class="back" href="#/">&larr; back</a>
    <div class="row"><h1>${esc(course.name)} ${gameCount(p.games)}</h1>${checks(p)}</div>
    ${metric('wins', p.courseWins, state.meta.settings.courseTarget)}
    ${metric('chapters', p.chaptersComplete, p.totalChapters)}
    ${state.local ? `<div class="toolbar">
      <a class="action" href="#/course/${esc(course.slug)}/variations"
         style="text-decoration:none">Variations &amp; drills &rarr;</a></div>` : ''}
    <div id="toggle"></div>
    <div id="chapters"></div>
    <div id="all"></div>
  </div>`);

  node.querySelector('#toggle').replaceChildren(listToggle());

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
      <div class="chlist"></div>
    </div>`);
    block.querySelector('.chlist').replaceChildren(modeList(
      gamesIn(stats.byCategory),
      deviations.filter((d) => d.chapters.includes(chapter.num)),
      CHAPTER_PAGE));
    chapters.appendChild(block);
  }

  const all = node.querySelector('#all');
  all.innerHTML = '<h2>Everything in this course</h2>';
  all.appendChild(modeList(gamesIn(p.byCategory), deviations, PAGE));
  return node;
}
