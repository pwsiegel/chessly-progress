/**
 * UI preferences that outlive a single view.
 *
 * Both are deliberately global, and changing either announces itself so the
 * router re-renders whatever is on screen. The list mode: games and deviations
 * are two readings of the same play, so choosing one on the Games tab should be
 * the reading a course page opens with too. The time-control filter: which
 * games every page counts, from progress bars to deviation tables.
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

const SPEED_KEY = 'chesstrack:speed';

/** 'all' or one time control; the data layer falls back to 'all' if unknown. */
export const speedFilter = () => localStorage.getItem(SPEED_KEY) || 'all';

export function setSpeedFilter(speed) {
  if (speed === speedFilter()) return;
  localStorage.setItem(SPEED_KEY, speed);
  window.dispatchEvent(new CustomEvent('speedchange'));
}
