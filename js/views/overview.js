/** Course cards and overall deviations — the page the public site opens on. */
import { state, courseList, progressFor } from '../data.js';
import { esc, metric, checks, gameCount, categoryStats, el } from '../ui.js';
import { deviationTable } from './deviations.js';

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

function section(title, courses) {
  if (!courses.length) return '';
  const order = (c) => {
    const p = progressFor(c.id) || {};
    return [p.metAll ? 0 : 1, p.metCourse ? 0 : 1, -(p.courseWins || 0)];
  };
  const sorted = [...courses].sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return `<h2>${title}</h2>${sorted.map(card).join('')}`;
}

export function render() {
  const { summary } = state.account;
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
    <div id="devs"></div>
    <footer>Account: ${esc(state.meta.accounts.find((a) => a.key === state.accountKey).label)}
      &middot; updated ${esc(state.meta.generated)}
      &middot; games open from your side, colored by result.</footer>
  </div>`);

  const rows = state.account.deviations;
  if (rows.length) {
    const holder = node.querySelector('#devs');
    holder.innerHTML = '<h2>Top deviations</h2><p class="note">Where you most often ' +
      'leave your prep, and the course move.</p>';
    holder.appendChild(deviationTable(rows.slice(0, 25), { showCourse: true }));
  }
  return node;
}
