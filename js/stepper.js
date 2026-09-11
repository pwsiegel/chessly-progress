/**
 * A board you can walk through a game, by arrow key, button, or move list.
 *
 * The board opens on the move that decided the screen — a deviation, or the
 * last move in book — with the rest of the game still ahead of it. The marks
 * belong to that position, and give way to a plain last-move highlight as soon
 * as you step away from it.
 */
import { Board, moveList } from './board.js';
import { replay } from './lines.js';

/**
 * Wires the `.boardhost`, `.mvs` and `.boardbar` of `node`; returns the key
 * handler to hang on the view.
 */
export function stepper(node, { sans, marks = [], at = sans.length, orientation = 'w' }) {
  const board = new Board(node.querySelector('.boardhost'),
    { orientation, interactive: false });
  const mvs = node.querySelector('.mvs');
  const bar = node.querySelector('.boardbar');
  let cursor = at;

  const step = {
    start: () => { cursor = 0; },
    prev: () => { cursor = Math.max(0, cursor - 1); },
    next: () => { cursor = Math.min(sans.length, cursor + 1); },
    end: () => { cursor = sans.length; },
  };

  function draw() {
    const chess = replay(sans, cursor);
    const history = chess.history({ verbose: true });
    const decided = cursor === at;
    board.setPosition(chess,
      decided || !history.length ? null : history[history.length - 1],
      decided ? marks : []);
    mvs.replaceChildren(moveList(sans, cursor - 1, (i) => { cursor = i + 1; draw(); }));
    const counter = bar && bar.querySelector('[data-role=pos]');
    if (counter) counter.textContent = `${cursor}/${sans.length}`;
  }

  if (bar) {
    bar.insertAdjacentHTML('afterbegin',
      '<button data-step="start">&laquo;</button>'
      + '<button data-step="prev">&lsaquo;</button>'
      + '<button data-step="next">&rsaquo;</button>'
      + '<button data-step="end">&raquo;</button>'
      + '<span class="count" data-role="pos"></span>');
    bar.addEventListener('click', (e) => {
      const action = e.target.dataset.step;
      if (!action) return;
      step[action]();
      draw();
    });
  }

  draw();

  return (e) => {
    if (e.key === 'ArrowLeft') step.prev();
    else if (e.key === 'ArrowRight') step.next();
    else if (e.key === 'Home') step.start();
    else if (e.key === 'End') step.end();
    else return;
    e.preventDefault();
    draw();
  };
}
