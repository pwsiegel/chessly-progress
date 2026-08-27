/**
 * Where drill history lives.
 *
 * A drill shuffle is the unit of persistence: it is created, worked through,
 * and only counts toward accuracy once finished. Partial shuffles are stored
 * too, so one can be resumed, but their results stay out of the statistics.
 *
 * Firestore holds only variation ids and outcomes — never move text — so course
 * content stays on this machine and out of any third-party service. The SDK
 * config arrives as data (`data/firebase.json`), which a public build never
 * ships; without it the store falls back to this browser's local storage.
 */

const SDK = 'https://www.gstatic.com/firebasejs/12.18.0';
const LOCAL_KEY = 'chessly.shuffles';

let firestore = null;
let auth = null;
let fs = null;           // the firestore module namespace
let currentUser = null;
const listeners = new Set();

export const store = {
  mode: 'local',         // 'firestore' once signed in, else 'local'
  get user() { return currentUser; },
};

function notify() {
  for (const cb of listeners) cb(currentUser, store.mode);
}

export function onAuthChange(cb) {
  listeners.add(cb);
  cb(currentUser, store.mode);
  return () => listeners.delete(cb);
}

export async function init() {
  let config;
  try {
    const resp = await fetch('data/firebase.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('no config');
    config = await resp.json();
  } catch {
    notify();
    return;                       // local storage only
  }

  const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  fs = firestoreMod;
  const app = initializeApp(config);
  auth = authMod.getAuth(app);
  firestore = firestoreMod.getFirestore(app);
  store.signInProvider = new authMod.GoogleAuthProvider();
  store.authMod = authMod;

  authMod.onAuthStateChanged(auth, (user) => {
    currentUser = user;
    store.mode = user ? 'firestore' : 'local';
    notify();
  });
}

export async function signIn() {
  if (!auth) throw new Error('Firebase is not configured in this build');
  await store.authMod.signInWithPopup(auth, store.signInProvider);
}

export async function signOut() {
  if (auth) await store.authMod.signOut(auth);
}

const collectionRef = () =>
  fs.collection(firestore, 'users', currentUser.uid, 'shuffles');

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(shuffles) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(shuffles));
}

export async function listShuffles() {
  if (store.mode === 'firestore') {
    const snap = await fs.getDocs(collectionRef());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return readLocal();
}

export async function getShuffle(id) {
  if (store.mode === 'firestore') {
    const snap = await fs.getDoc(fs.doc(collectionRef(), id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  return readLocal().find((s) => s.id === id) || null;
}

export async function saveShuffle(shuffle) {
  if (store.mode === 'firestore') {
    await fs.setDoc(fs.doc(collectionRef(), shuffle.id), stripId(shuffle));
    return shuffle;
  }
  const all = readLocal().filter((s) => s.id !== shuffle.id);
  all.push(shuffle);
  writeLocal(all);
  return shuffle;
}

export async function deleteShuffle(id) {
  if (store.mode === 'firestore') {
    await fs.deleteDoc(fs.doc(collectionRef(), id));
    return;
  }
  writeLocal(readLocal().filter((s) => s.id !== id));
}

const stripId = ({ id, ...rest }) => rest;

export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Accuracy per variation, folded over finished shuffles only.
 * `window` limits each variation to its most recent N attempts.
 */
export function accuracy(shuffles, window = 0) {
  const done = shuffles
    .filter((s) => s.completedAt)
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));

  const stats = {};
  for (const shuffle of done) {
    for (const [variationId, result] of Object.entries(shuffle.results || {})) {
      const entry = stats[variationId] || (stats[variationId] = {
        attempts: 0, correct: 0, last: null,
      });
      if (window && entry.attempts >= window) continue;
      entry.attempts += 1;
      if (!result.mistakes) entry.correct += 1;
      if (!entry.last) entry.last = shuffle.completedAt;
    }
  }
  return stats;
}
