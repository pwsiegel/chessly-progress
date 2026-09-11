/**
 * A click-to-move chess board.
 *
 * Rendering is a plain 8x8 grid; pieces are the Cburnett SVG set (the one
 * Lichess ships), vendored in `web/vendor/pieces/` and applied as CSS
 * backgrounds, so a piece is one element with a data attribute.
 *
 * The board draws whatever position it is given and reports attempted moves; it
 * owns no game state, so drilling, review, and deviation replay all reuse it.
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export class Board {
  /**
   * @param {HTMLElement} el      container, replaced with the grid
   * @param {object}      options orientation ('w'|'b'), interactive, onMove
   *   onMove(from, to, promotion) -> truthy if the move was accepted
   */
  constructor(el, { orientation = 'w', interactive = true, onMove = null } = {}) {
    this.el = el;
    this.orientation = orientation;
    this.interactive = interactive;
    this.onMove = onMove;
    this.chess = null;
    this.selected = null;
    this.lastMove = null;
    this.marks = [];
    this.errorSquare = null;

    this.el.className = 'board';
    this.el.addEventListener('click', (e) => this._click(e));
  }

  /** `marks` tint squares by tone ('good' | 'bad'), for replaying a decision. */
  setPosition(chess, lastMove = null, marks = []) {
    this.chess = chess;
    this.lastMove = lastMove;
    this.marks = marks;
    this.selected = null;
    this.errorSquare = null;
    this.render();
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this.render();
  }

  setInteractive(on) {
    this.interactive = on;
    this.selected = null;
    this.render();
  }

  flashError(square) {
    this.errorSquare = square;
    this.selected = null;
    this.render();
    setTimeout(() => {
      if (this.errorSquare === square) {
        this.errorSquare = null;
        this.render();
      }
    }, 550);
  }

  _squares() {
    const files = this.orientation === 'w' ? FILES : [...FILES].reverse();
    const ranks = this.orientation === 'w' ? RANKS : [...RANKS].reverse();
    const out = [];
    for (const rank of ranks) for (const file of files) out.push(file + rank);
    return out;
  }

  _destinations(square) {
    if (!this.chess) return [];
    return this.chess.moves({ square, verbose: true }).map((m) => m.to);
  }

  render() {
    if (!this.chess) return;
    const dests = this.selected ? this._destinations(this.selected) : [];
    const board = {};
    for (const row of this.chess.board()) {
      for (const cell of row || []) if (cell) board[cell.square] = cell;
    }

    this.el.innerHTML = this._squares().map((square) => {
      const file = FILES.indexOf(square[0]);
      const rank = Number(square[1]);
      const shade = (file + rank) % 2 === 0 ? 'light' : 'dark';
      const classes = [shade];
      if (square === this.selected) classes.push('sel');
      if (square === this.errorSquare) classes.push('err');
      if (this.lastMove && square === this.lastMove.from) classes.push('from');
      if (this.lastMove && square === this.lastMove.to) classes.push('to');
      for (const m of this.marks) {
        if (square === m.from || square === m.to) classes.push(`mk-${m.tone}`);
      }

      const piece = board[square];
      const glyph = piece
        ? `<span class="piece" data-p="${piece.color}${piece.type.toUpperCase()}"></span>`
        : '';
      const dot = dests.includes(square)
        ? `<span class="dot${piece ? ' capture' : ''}"></span>` : '';
      const coords = this._coords(square);
      return `<div class="sq ${classes.join(' ')}" data-sq="${square}">` +
        `${dot}${glyph}${coords}</div>`;
    }).join('');
  }

  /** File letters along the bottom edge, rank numbers up the left edge. */
  _coords(square) {
    const files = this.orientation === 'w' ? FILES : [...FILES].reverse();
    const ranks = this.orientation === 'w' ? RANKS : [...RANKS].reverse();
    const out = [];
    if (square[1] === ranks[7]) out.push(`<span class="coord file">${square[0]}</span>`);
    if (square[0] === files[0]) out.push(`<span class="coord rank">${square[1]}</span>`);
    return out.join('');
  }

  _click(event) {
    if (!this.interactive || !this.chess) return;
    const cell = event.target.closest('.sq');
    if (!cell) return;
    const square = cell.dataset.sq;

    if (this.selected && square !== this.selected) {
      if (this._destinations(this.selected).includes(square)) {
        const from = this.selected;
        this.selected = null;
        const accepted = this.onMove && this.onMove(from, square, this._promotion(from, square));
        if (!accepted) this.render();
        return;
      }
    }
    const piece = this.chess.get(square);
    this.selected = piece && piece.color === this.chess.turn() ? square : null;
    this.render();
  }

  /** Courses effectively never underpromote, so a promotion is a queen. */
  _promotion(from, to) {
    const piece = this.chess.get(from);
    if (!piece || piece.type !== 'p') return undefined;
    return to[1] === '8' || to[1] === '1' ? 'q' : undefined;
  }
}

/** Renders a move list with a clickable cursor; index -1 is the start position. */
export function moveList(sans, cursor, onPick) {
  const el = document.createElement('div');
  el.className = 'movelist';
  const parts = [];
  sans.forEach((san, i) => {
    if (i % 2 === 0) parts.push(`<span class="no">${i / 2 + 1}.</span>`);
    parts.push(`<span class="mv${i === cursor ? ' here' : ''}" data-i="${i}">${san}</span>`);
  });
  el.innerHTML = parts.join(' ');
  el.addEventListener('click', (e) => {
    const mv = e.target.closest('.mv');
    if (mv) onPick(Number(mv.dataset.i));
  });
  return el;
}
