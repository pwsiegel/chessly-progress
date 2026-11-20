/** Course cards — the page the public site opens on. */
import { state, courseList, progressFor, view } from '../data.js';
import { esc, metric, checks, gameCount, categoryStats, el } from '../ui.js';

function card(course) {
  const p = progressFor(course.id);
  if (!p) return '';
  return `<div class="goal">
    <div class="row"><span class="title">
      <a href="#/course/${esc(course.slug)}">${esc(course.name)}</a>
      ${gameCount(p.games)}</span>${checks(p)}</div>
    ${metric('wins', p.courseWins, state.meta.settings.courseTarget)}
    ${metric('chapters', p.chaptersComplete, p.totalChapters)}
    <div class="stats">${categoryStats(p.byCategory)}</div>
  </div>`;
}

function cards(courses) {
  const order = (c) => {
    const p = progressFor(c.id) || {};
    return [p.metAll ? 0 : 1, p.metCourse ? 0 : 1, -(p.courseWins || 0)];
  };
  return [...courses].sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  }).map(card).join('');
}

/** Chessly courses first; my own custom courses below a divider. */
function section(title, courses) {
  if (!courses.length) return '';
  const custom = courses.filter((c) => c.custom);
  return `<h2>${title}</h2>${cards(courses.filter((c) => !c.custom))}` +
    (custom.length ? `<div class="divider"><span>custom courses</span></div>${cards(custom)}` : '');
}

export function render() {
  const { summary } = view();
  const courses = courseList();
  const node = el(`<div>
    <h1>Chessly Progress</h1>
    <p class="sub">Goal: ${state.meta.settings.courseTarget} in-book wins with every
      opening course in Chessly.<br>Stretch goal:
      ${state.meta.settings.chapterTarget} in-book wins with every chapter.</p>
    <div class="summary">
      <div>${summary.qualifyingWins}<span>qualifying wins</span></div>
      <div>${summary.coursesMet}/${summary.totalCourses}<span>course goals met</span></div>
      <div>${summary.stretchMet}/${summary.totalCourses}<span>stretch goal</span></div>
      <div>${summary.gamesAnalyzed}<span>games analyzed</span></div>
    </div>
    <div class="columns">
      <div class="column">${section('White', courses.filter((c) => c.color === 'W'))}</div>
      <div class="column">${section('Black', courses.filter((c) => c.color === 'B'))}</div>
    </div>
    <footer>Account: ${esc(state.meta.accounts.find((a) => a.key === state.accountKey).label)}
      &middot; updated ${esc(state.meta.generated)}
      &middot; games open from your side, colored by result.</footer>
  </div>`);
  return node;
}
