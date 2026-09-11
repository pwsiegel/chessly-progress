/**
 * One game, opened on the moment that decided it.
 *
 * The board shows the position after I left the course — my move against the
 * move the course teaches — or, for a game that stayed in book, the position
 * after its last book move.
 */
import { state, courseById } from '../data.js';
import { esc, el, gameLinks, dateOf } from '../ui.js';
import { markedBoard } from '../lines.js';
import { stepper } from '../stepper.js';

export function render({ index }) {
  const game = state.account.games[Number(index)];
  if (!game) return el('<p class="error">No such game.</p>');

  const course = courseById(game.courseId);
  const { taught = [] } = game.board || {};
  const { sans, at, marks } = markedBoard(game.board || {});
  const orientation = game.color === 'W' ? 'w' : 'b';
  const deviated = game.category === 'youDev' && at > 0;

  const heading = deviated
    ? `Move ${game.move}: <span class="bad">${esc(sans[at - 1])}</span>
       instead of <span class="good">${esc(taught.join('/')) || '?'}</span>`
    : (game.category === 'oppDev' ? 'The opponent left the line' : 'Stayed in book');
  const caption = deviated
    ? 'Your move in red, the course move in green.'
    : 'The last move still in book, in green.';

  const node = el(`<div>
    <a class="back" href="#/games">&larr; back</a>
    <h1>${heading}</h1>
    <p class="sub">${esc(course ? course.name : '?')} &middot;
      ${esc(dateOf(game.ts))} &middot; ${esc(game.result)} as
      ${orientation === 'w' ? 'White' : 'Black'}</p>
    <div class="split">
      <div class="left"><div class="boardhost"></div>
        <div class="boardbar"><span class="dim">${caption}</span></div>
      </div>
      <div class="right">
        <h2>The game</h2>
        <div class="mvs"></div>
        <div class="links">${gameLinks([game])}</div>
      </div>
    </div>
  </div>`);

  node.onKey = stepper(node, { sans, at, marks, orientation });
  return node;
}
