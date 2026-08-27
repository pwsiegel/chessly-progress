/**
 * The drill runner.
 *
 * One variation at a time, in the shuffle's fixed random order: the opponent's
 * moves play themselves, mine have to be found. A wrong move is counted and
 * retried rather than skipped, and the answer is offered after two misses.
 *
 * Progress is saved after every variation so a shuffle can be resumed, but the
 * run only counts toward accuracy when the last variation is done.
 */
import { courseById, variationById } from '../data.js';
import { esc, el } from '../ui.js';
import { Board } from '../board.js';
import { getShuffle, saveShuffle } from '../store.js';
import { replay } from '../lines.js';

const REVEAL_AFTER = 2;
const OPPONENT_DELAY = 350;

const bare = (san) => san.replace(/[+#]/g, '');

export async function render({ shuffleId }) {
  const shuffle = await getShuffle(shuffleId);
  if (!shuffle) return el('<p class="error">No such drill shuffle.</p>');
  const course = courseById(shuffle.courseId);
  const mine = course && course.color === 'W' ? 'w' : 'b';

  const node = el(`<div>
    <a class="back" href="#/shuffles">&larr; shuffles</a>
    <div class="row"><h1>${esc(shuffle.name)}</h1>
      <span class="count" id="counter"></span></div>
    <div class="progressline" id="progress"></div>
    <div class="split">
      <div class="left">
        <div class="boardhost"></div>
        <div class="drill-status" id="status"></div>
        <div class="boardbar">
          <button id="reveal">Show move</button>
          <button id="skip">Skip variation</button>
        </div>
      </div>
      <div class="right"><div id="side"></div></div>
    </div>
  </div>`);

  const statusEl = node.querySelector('#status');
  const sideEl = node.querySelector('#side');
  const board = new Board(node.querySelector('.boardhost'),
    { orientation: mine, onMove: (from, to, promotion) => attempt(from, to, promotion) });

  let variation = null;
  let ply = 0;
  let mistakes = 0;
  let chess = null;
  let finished = false;

  function paint() {
    const total = shuffle.order.length;
    node.querySelector('#counter').textContent =
      `${Math.min(shuffle.position + 1, total)} / ${total}`;
    node.querySelector('#progress').innerHTML = shuffle.order.map((id, i) => {
      const result = shuffle.results[id];
      const cls = result ? (result.mistakes ? 'err' : 'ok') : i === shuffle.position ? 'now' : '';
      return `<i class="${cls}"></i>`;
    }).join('');
  }

  function say(text, kind = '') {
    statusEl.className = `drill-status ${kind}`;
    statusEl.innerHTML = text;
  }

  function showBoard() {
    const history = chess.history({ verbose: true });
    board.setPosition(chess, history.length ? history[history.length - 1] : null);
    board.setInteractive(!finished && chess.turn() === mine && ply < variation.sans.length);
  }

  function loadCurrent() {
    const id = shuffle.order[shuffle.position];
    variation = variationById(shuffle.courseId, id);
    mistakes = 0;
    ply = 0;
    if (!variation) {
      finishVariation(0);
      return;
    }
    chess = replay([], 0);
    sideEl.innerHTML = `<h2>Variation</h2>
      <p class="sub">Ch ${variation.ch} · St ${variation.st} · #${variation.i}
        &middot; ${variation.sans.length} plies</p>
      <p class="note">You are ${mine === 'w' ? 'White' : 'Black'}.</p>`;
    say('');
    advanceOpponent();
  }

  function advanceOpponent() {
    while (ply < variation.sans.length && chess.turn() !== mine) {
      chess.move(variation.sans[ply]);
      ply += 1;
    }
    showBoard();
    if (ply >= variation.sans.length) finishVariation(mistakes);
  }

  function attempt(from, to, promotion) {
    if (finished || chess.turn() !== mine) return false;
    const expected = variation.sans[ply];
    let move;
    try {
      move = chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    if (bare(move.san) !== bare(expected)) {
      chess.undo();
      mistakes += 1;
      board.flashError(to);
      say(mistakes >= REVEAL_AFTER
        ? `Not the move. The course plays <b class="good">${esc(expected)}</b>.`
        : 'Not the move — try again.', 'err');
      return false;
    }
    ply += 1;
    say(`<span class="good">${esc(move.san)}</span>`, 'ok');
    showBoard();
    setTimeout(() => {
      if (!finished) advanceOpponent();
    }, OPPONENT_DELAY);
    return true;
  }

  async function finishVariation(count) {
    const id = shuffle.order[shuffle.position];
    shuffle.results[id] = { mistakes: count };
    shuffle.position += 1;
    const done = shuffle.position >= shuffle.order.length;
    if (done) shuffle.completedAt = new Date().toISOString();
    await saveShuffle(shuffle);
    paint();
    if (done) {
      finished = true;
      board.setInteractive(false);
      const clean = Object.values(shuffle.results).filter((r) => !r.mistakes).length;
      say(`Shuffle complete — <b>${clean} of ${shuffle.order.length}</b> clean. ` +
        'Accuracy has been recorded.', 'ok');
      sideEl.innerHTML += '<div class="toolbar">' +
        '<a class="action primary" href="#/shuffles" style="text-decoration:none">' +
        'Back to shuffles</a></div>';
      return;
    }
    setTimeout(loadCurrent, OPPONENT_DELAY * 2);
  }

  node.querySelector('#reveal').addEventListener('click', () => {
    if (finished || !variation || ply >= variation.sans.length) return;
    mistakes = Math.max(mistakes, 1);
    say(`The course plays <b class="good">${esc(variation.sans[ply])}</b>.`, 'err');
  });
  node.querySelector('#skip').addEventListener('click', () => {
    if (!finished && variation) finishVariation(Math.max(mistakes, 1));
  });

  paint();
  if (shuffle.position >= shuffle.order.length) {
    finished = true;
    const clean = Object.values(shuffle.results).filter((r) => !r.mistakes).length;
    board.setPosition(replay([], 0));
    say(`This shuffle is finished — ${clean} of ${shuffle.order.length} clean.`, 'ok');
  } else {
    loadCurrent();
  }
  return node;
}
