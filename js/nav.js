/**
 * Back that means back.
 *
 * Every screen used to name a fixed destination in its back link, which is
 * rarely the screen you came from. Each history entry is stamped with how deep
 * into the app it is, so the link can step back through your own path and fall
 * through to the overview only when there is nothing behind it.
 */
const HOME = '#/';

let current = -1;

/** Record where this history entry sits; re-entering a stamped one restores it. */
export function stamp() {
  const state = history.state;
  if (state && typeof state.appDepth === 'number') {
    current = state.appDepth;
    return;
  }
  current += 1;
  history.replaceState({ ...state, appDepth: current }, '');
}

export function goBack() {
  if (current > 0) history.back();
  else if (location.hash && location.hash !== HOME) location.hash = HOME;
}
