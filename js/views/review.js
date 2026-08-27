/**
 * Review: read a variation before drilling it.
 *
 * The list on the right is every variation in the course; the board on the left
 * steps through the selected one, by click or arrow key.
 */
import { courseBySlug, variationsFor, linesFor } from '../data.js';
import { esc, reachText, el } from '../ui.js';
import { Board, moveList } from '../board.js';
import { replay } from '../lines.js';

export function render({ slug, variationId }) {
  const course = courseBySlug(slug);
  if (!course) return el('<p class="error">No such course.</p>');
  if (!linesFor(course.id)) return el('<p class="error">This build has no course lines.</p>');

  const variations = variationsFor(course.id);
  let current = variations.find((v) => v.id === variationId) || variations[0];
  if (!current) return el('<p class="error">This course has no variations.</p>');
  let cursor = 0;                    // moves played so far

  const node = el(`<div>
    <a class="back" href="#/course/${esc(course.slug)}/variations">&larr; variations</a>
    <h1>${esc(course.name)}</h1>
    <div class="split">
      <div class="left">
        <div class="boardhost"></div>
        <div class="boardbar">
          <button data-step="start">&laquo;</button>
          <button data-step="prev">&lsaquo;</button>
          <button data-step="next">&rsaquo;</button>
          <button data-step="end">&raquo;</button>
          <button data-step="flip">flip</button>
          <span class="dim" id="pos"></span>
        </div>
        <div class="mvs"></div>
      </div>
      <div class="right">
        <h2>Variations (${variations.length})</h2>
        <div class="varlist">${variations.map((v) => `
          <div class="item" data-id="${esc(v.id)}">
            <span>Ch ${v.ch} · St ${v.st} · #${v.i}</span>
            <span class="dim">${reachText(v)}</span>
          </div>`).join('')}</div>
      </div>
    </div>
  </div>`);

  const board = new Board(node.querySelector('.boardhost'),
    { orientation: course.color === 'W' ? 'w' : 'b', interactive: false });

  function draw() {
    const chess = replay(current.sans, cursor);
    const played = chess.history({ verbose: true });
    board.setPosition(chess, played.length ? played[played.length - 1] : null);

    const mvs = node.querySelector('.mvs');
    mvs.innerHTML = '';
    mvs.appendChild(moveList(current.sans, cursor - 1, (i) => {
      cursor = i + 1;
      draw();
    }));
    node.querySelector('#pos').textContent =
      `Ch ${current.ch} · St ${current.st} · #${current.i} — ${cursor}/${current.sans.length}`;
    node.querySelectorAll('.varlist .item').forEach((item) => {
      item.classList.toggle('here', item.dataset.id === current.id);
    });
  }

  const step = {
    start: () => { cursor = 0; },
    prev: () => { cursor = Math.max(0, cursor - 1); },
    next: () => { cursor = Math.min(current.sans.length, cursor + 1); },
    end: () => { cursor = current.sans.length; },
    flip: () => board.setOrientation(board.orientation === 'w' ? 'b' : 'w'),
  };

  node.querySelector('.boardbar').addEventListener('click', (e) => {
    const action = e.target.dataset.step;
    if (!action) return;
    step[action]();
    if (action !== 'flip') draw();
  });

  node.querySelector('.varlist').addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item) return;
    current = variations.find((v) => v.id === item.dataset.id) || current;
    cursor = 0;
    history.replaceState(null, '',
      `#/course/${course.slug}/review/${current.id}`);
    draw();
  });

  node.onKey = (e) => {
    if (e.key === 'ArrowLeft') { step.prev(); draw(); }
    else if (e.key === 'ArrowRight') { step.next(); draw(); }
    else if (e.key === 'Home') { step.start(); draw(); }
    else if (e.key === 'End') { step.end(); draw(); }
    else return;
    e.preventDefault();
  };

  draw();
  return node;
}
