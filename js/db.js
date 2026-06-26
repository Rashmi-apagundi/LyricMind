/* ======================================================
   LYRICMIND AI — DATA STORE
   ====================================================== */

const DEFAULT_TODOS = [
  { id: 't1', text: 'Write in your journal for 10 minutes', checked: false },
  { id: 't2', text: 'Listen to focus music during work', checked: false },
  { id: 't3', text: 'Complete one important task before noon', checked: false },
  { id: 't4', text: 'Take a 15-minute walk outside', checked: false },
  { id: 't5', text: 'Read for 20 minutes before bed', checked: false }
];

/* ── State management using localStorage ── */

const STORAGE_KEY = 'lyricmind_state';

function getDefaultState() {
  return {
    user: null,
    isLoggedIn: false,
    spotifyConnected: false,
    journals: [],
    todos: DEFAULT_TODOS.map(t => ({ ...t })),
    diary: []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all keys exist
      const defaults = getDefaultState();
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
  return getDefaultState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
