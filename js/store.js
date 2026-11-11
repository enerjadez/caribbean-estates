const KEY = "caribbean-estates-v1";

export function emptyState() {
  return { games: {}, spirit: {}, word: { overrides: {}, winners: {} }, guesses: [], pose: {}, bounties: {} };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      word: { ...emptyState().word, ...(parsed.word || {}) }
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
