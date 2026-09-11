/**
 * UI preferences that outlive a single view.
 *
 * The list mode is deliberately global: games and deviations are two readings
 * of the same play, so choosing one on the Games tab should be the reading a
 * course page opens with too. Changing it announces itself, and the router
 * re-renders whatever is on screen.
 */
const KEY = 'chesstrack:listMode';
const MODES = ['games', 'deviations'];

export function listMode() {
  const stored = localStorage.getItem(KEY);
  return MODES.includes(stored) ? stored : 'games';
}

export function setListMode(mode) {
  if (!MODES.includes(mode) || mode === listMode()) return;
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent('listmodechange'));
}
