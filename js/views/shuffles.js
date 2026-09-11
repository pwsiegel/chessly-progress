/**
 * Drill shuffles: the unit of both practice and persistence.
 *
 * A shuffle fixes a set of variations and a random order through them. It can
 * be left part-way and resumed, or replayed later as a fresh run. Only a
 * finished shuffle contributes to accuracy, so an abandoned session never
 * distorts the statistics.
 */
import { courseById, state } from '../data.js';
import { esc, el } from '../ui.js';
import { listShuffles, saveShuffle, deleteShuffle, newId } from '../store.js';

function shuffled(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function createShuffle({ name, courseId, variationIds }) {
  const shuffle = {
    id: newId(),
    name: name || 'Drill',
    courseId,
    variationIds: [...variationIds],
    order: shuffled(variationIds),
    position: 0,
    results: {},
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  await saveShuffle(shuffle);
  return shuffle;
}

export const replayShuffle = (shuffle) => createShuffle({
  name: shuffle.name,
  courseId: shuffle.courseId,
  variationIds: shuffle.variationIds,
});

function summarise(shuffle) {
  const done = Object.values(shuffle.results || {});
  const clean = done.filter((r) => !r.mistakes).length;
  return { done: done.length, clean };
}

export async function render() {
  const shuffles = (await listShuffles())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const node = el(`<div>
    <a class="back" href="#/">&larr; back</a>
    <h1>Drill shuffles</h1>
    <p class="sub">Unfinished shuffles can be resumed; finished ones can be replayed.
      Only finished shuffles count toward accuracy.</p>
    <div id="list"></div>
  </div>`);

  const list = node.querySelector('#list');
  if (!shuffles.length) {
    list.innerHTML = '<p class="empty">No shuffles yet. Open a course, pick some ' +
      'variations, and start one.</p>';
    return node;
  }

  for (const shuffle of shuffles) {
    const course = courseById(shuffle.courseId);
    const { done, clean } = summarise(shuffle);
    const total = shuffle.order.length;
    const card = el(`<div class="card">
      <div class="row">
        <span class="title"><b>${esc(shuffle.name)}</b>
          <span class="ngames">${esc(course ? course.name : '?')}</span></span>
        <span class="count">${done} / ${total}${shuffle.completedAt
          ? ` &middot; ${clean} clean` : ''}</span>
      </div>
      <div class="toolbar">
        <button class="action primary" data-act="go">${shuffle.completedAt
          ? 'Replay' : done ? 'Resume' : 'Start'}</button>
        <button class="action" data-act="del">Delete</button>
        <span class="dim">${esc((shuffle.completedAt || shuffle.createdAt).slice(0, 10))}
          ${shuffle.completedAt ? '· finished' : '· in progress'}</span>
      </div>
    </div>`);

    card.querySelector('[data-act=go]').addEventListener('click', async () => {
      const target = shuffle.completedAt ? await replayShuffle(shuffle) : shuffle;
      location.hash = `#/drill/${target.id}`;
    });
    card.querySelector('[data-act=del]').addEventListener('click', async () => {
      await deleteShuffle(shuffle.id);
      card.remove();
    });
    list.appendChild(card);
  }
  return node;
}
