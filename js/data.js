/**
 * Bundle loading and app mode.
 *
 * A build is "local" exactly when it shipped the course bundle. A public build
 * has no courses.json, so the fetch 404s and every training route stays hidden.
 * Mode is therefore a property of the data, never a flag someone can flip.
 */

const DATA = 'data';

export const state = {
  meta: null,        // public.json: settings, accounts, course metadata
  account: null,     // the loaded account bundle
  accountKey: null,
  courses: null,     // courses.json, or null in a public build
  local: false,
};

async function getJSON(path) {
  const resp = await fetch(path, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`${path}: ${resp.status}`);
  return resp.json();
}

export async function boot() {
  state.meta = await getJSON(`${DATA}/public.json`);
  try {
    state.courses = await getJSON(`${DATA}/courses.json`);
    state.local = true;
  } catch {
    state.courses = null;
    state.local = false;
  }
  const wanted = new URLSearchParams(location.search).get('account');
  const keys = state.meta.accounts.map((a) => a.key);
  await selectAccount(keys.includes(wanted) ? wanted : keys[0]);
}

export async function selectAccount(key) {
  const entry = state.meta.accounts.find((a) => a.key === key);
  if (!entry) throw new Error(`unknown account ${key}`);
  state.account = await getJSON(`${DATA}/${entry.file}`);
  state.accountKey = key;
}

export const courseList = () => state.meta.courses;

export const courseBySlug = (slug) =>
  state.meta.courses.find((c) => c.slug === slug) || null;

export const courseById = (id) =>
  state.meta.courses.find((c) => c.id === id) || null;

/** Per-account progress for a course. */
export const progressFor = (courseId) => state.account.courses[courseId] || null;

/** Course lines, present only in a local build. */
export const linesFor = (courseId) =>
  state.courses ? state.courses.courses[courseId] || null : null;

export const variationsFor = (courseId) => (linesFor(courseId) || {}).variations || [];

export function variationById(courseId, variationId) {
  return variationsFor(courseId).find((v) => v.id === variationId) || null;
}

/** Games referenced by an index list in the account bundle. */
export const gamesAt = (indices) => (indices || []).map((i) => state.account.games[i]);

export const label = (v) => `Ch ${v.ch} · St ${v.st} · #${v.i}`;
