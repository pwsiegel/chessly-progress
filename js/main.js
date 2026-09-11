/** Boot, navigation, and hash routing. */
import { state, boot, selectAccount } from './data.js';
import { esc, el } from './ui.js';
import * as store from './store.js';
import { stamp, goBack } from './nav.js';
import * as overview from './views/overview.js';
import * as course from './views/course.js';
import * as deviations from './views/deviations.js';
import * as games from './views/games.js';
import * as game from './views/game.js';
import * as variations from './views/variations.js';
import * as review from './views/review.js';
import * as drill from './views/drill.js';
import * as shuffles from './views/shuffles.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let currentView = null;

const ROUTES = [
  [/^\/?$/, () => overview.render()],
  [/^\/games$/, () => games.renderList()],
  [/^\/deviation\/(.+)$/, (index) => deviations.renderOne({ index })],
  [/^\/game\/(\d+)$/, (index) => game.render({ index })],
  [/^\/course\/([^/]+)$/, (slug) => course.render({ slug })],
  [/^\/course\/([^/]+)\/variations$/, (slug) => variations.render({ slug }), true],
  [/^\/course\/([^/]+)\/review\/([^/]+)$/,
    (slug, variationId) => review.render({ slug, variationId }), true],
  [/^\/shuffles$/, () => shuffles.render(), true],
  [/^\/drill\/([^/]+)$/, (shuffleId) => drill.render({ shuffleId }), true],
];

function themeToggle() {
  const button = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const icon = () => (root.getAttribute('data-theme') === 'dark' ? '☀' : '☾');
  button.textContent = icon();
  button.onclick = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    button.textContent = icon();
  };
}

function renderNav() {
  const accounts = state.meta.accounts;
  nav.hidden = false;
  nav.innerHTML = `
    <a href="#/">Courses</a>
    <a href="#/games">Games</a>
    ${state.local ? '<a href="#/shuffles">Drills</a>' : ''}
    <span class="spacer"></span>
    ${accounts.length > 1 ? `<select id="account">${accounts.map((a) =>
      `<option value="${esc(a.key)}"${a.key === state.accountKey ? ' selected' : ''}
       >${esc(a.label)}</option>`).join('')}</select>` : ''}
    ${state.local ? '<span class="who" id="who"></span>' : ''}`;

  const picker = nav.querySelector('#account');
  if (picker) {
    picker.addEventListener('change', async () => {
      await selectAccount(picker.value);
      const url = new URL(location);
      url.searchParams.set('account', picker.value);
      history.replaceState(null, '', url);
      route();
    });
  }
  paintAuth();
  markActive();
}

function paintAuth() {
  const who = nav.querySelector('#who');
  if (!who) return;
  const user = store.store.user;
  if (user) {
    who.innerHTML = `${esc(user.displayName || user.email || 'signed in')}` +
      '<button id="signout">sign out</button>';
    who.querySelector('#signout').onclick = () => store.signOut();
  } else {
    who.innerHTML = 'history saved in this browser<button id="signin">sign in</button>';
    who.querySelector('#signin').onclick = () => store.signIn().catch((e) => {
      who.innerHTML = `<span class="error">${esc(e.message)}</span>`;
    });
  }
}

function markActive() {
  const path = location.hash.slice(1) || '/';
  nav.querySelectorAll('a').forEach((a) => {
    const target = a.getAttribute('href').slice(1);
    a.classList.toggle('active', target === '/' ? path === '/' : path.startsWith(target));
  });
}

async function route() {
  stamp();
  const path = location.hash.slice(1) || '/';
  markActive();
  for (const [pattern, view, localOnly] of ROUTES) {
    const match = path.match(pattern);
    if (!match) continue;
    if (localOnly && !state.local) break;
    app.innerHTML = '<p class="note">Loading…</p>';
    try {
      const node = await view(...match.slice(1));
      app.replaceChildren(node);
      currentView = node;
    } catch (error) {
      app.replaceChildren(el(`<p class="error">${esc(error.message)}</p>`));
      console.error(error);
    }
    window.scrollTo(0, 0);
    return;
  }
  app.replaceChildren(el('<p class="error">Page not found.</p>'));
}

// Every screen's back link walks your own path, not a fixed destination.
app.addEventListener('click', (e) => {
  const link = e.target.closest('a.back');
  if (!link) return;
  e.preventDefault();
  goBack();
});

document.addEventListener('keydown', (e) => {
  if (currentView && currentView.onKey) currentView.onKey(e);
});
window.addEventListener('hashchange', route);
window.addEventListener('listmodechange', route);

(async () => {
  themeToggle();
  try {
    await boot();
  } catch (error) {
    app.innerHTML = `<p class="error">Could not load data: ${esc(error.message)}</p>`;
    return;
  }
  try {
    await store.init();
  } catch (error) {
    console.warn('persistence unavailable, falling back to local storage', error);
  }
  store.onAuthChange(() => {
    paintAuth();
    if (location.hash.startsWith('#/shuffles') || location.hash.startsWith('#/drill')) route();
  });
  renderNav();
  route();
})();
