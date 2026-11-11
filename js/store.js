const KEY = "caribbean-estates-v1";

export function emptyState() {
  return {
    games: {},
    spirit: {},
    word: { overrides: {}, winners: {} },
    guesses: [],
    pose: {},
    bounties: {},
    votes: {},
    award: null,
    revision: 0,
    updatedAt: null
  };
}

function cleanAward(award) {
  if (!award || typeof award.winner !== "string") return null;
  const winner = award.winner.trim();
  if (!winner) return null;
  return { winner, at: typeof award.at === "string" ? award.at : null };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      word: { ...emptyState().word, ...(parsed.word || {}) },
      votes: { ...(parsed.votes || {}) },
      award: cleanAward(parsed.award),
      revision: Number(parsed.revision) || 0,
      updatedAt: parsed.updatedAt || null
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function sharedBoard(state) {
  const bounties = {};
  for (const [id, row] of Object.entries(state.bounties || {})) {
    const next = {};
    for (const [teamId, cell] of Object.entries(row || {})) {
      if (cell?.confirmed) next[teamId] = { confirmed: true };
    }
    if (Object.keys(next).length) bounties[id] = next;
  }
  return structuredClone({
    games: state.games || {},
    spirit: state.spirit || {},
    word: {
      overrides: { ...(state.word?.overrides || {}) },
      winners: { ...(state.word?.winners || {}) }
    },
    guesses: [...(state.guesses || [])],
    pose: state.pose || {},
    bounties,
    votes: state.votes || {},
    award: cleanAward(state.award),
    revision: Number(state.revision) || 0,
    updatedAt: state.updatedAt || null
  });
}

export function applyShared(state, board) {
  const photos = {};
  for (const [id, row] of Object.entries(state.bounties || {})) {
    for (const [teamId, cell] of Object.entries(row || {})) {
      if (cell?.photo) {
        photos[id] = photos[id] || {};
        photos[id][teamId] = cell.photo;
      }
    }
  }
  state.games = board.games || {};
  state.spirit = board.spirit || {};
  state.word = {
    overrides: { ...(board.word?.overrides || {}) },
    winners: { ...(board.word?.winners || {}) }
  };
  state.guesses = [...(board.guesses || [])];
  state.pose = board.pose || {};
  state.votes = { ...(board.votes || {}) };
  state.award = cleanAward(board.award);
  state.bounties = {};
  for (const [id, row] of Object.entries(board.bounties || {})) {
    state.bounties[id] = {};
    for (const [teamId, cell] of Object.entries(row || {})) {
      state.bounties[id][teamId] = { confirmed: !!cell?.confirmed };
    }
  }
  for (const [id, row] of Object.entries(photos)) {
    state.bounties[id] = state.bounties[id] || {};
    for (const [teamId, photo] of Object.entries(row)) {
      const cell = state.bounties[id][teamId] || { confirmed: false };
      state.bounties[id][teamId] = { ...cell, photo };
    }
  }
  state.revision = Number(board.revision) || 0;
  state.updatedAt = board.updatedAt || null;
}

function changed(local, base) {
  return JSON.stringify(local ?? null) !== JSON.stringify(base ?? null);
}

function mergeMaps(remote = {}, local = {}, base = {}) {
  const keys = new Set([...Object.keys(remote || {}), ...Object.keys(local || {})]);
  const out = {};
  for (const key of keys) {
    const value = changed(local?.[key], base?.[key]) ? local?.[key] : remote?.[key];
    if (value != null) out[key] = value;
  }
  return out;
}

function mergeDeep(remote = {}, local = {}, base = {}) {
  const keys = new Set([...Object.keys(remote || {}), ...Object.keys(local || {})]);
  const out = {};
  for (const key of keys) {
    const row = mergeMaps(remote?.[key], local?.[key], base?.[key]);
    if (Object.keys(row).length || changed(local?.[key], base?.[key])) out[key] = row;
  }
  return out;
}

function guessKey(guess) {
  return `${guess.date}|${guess.playerId}|${guess.text}|${guess.at}`;
}

function mergeGuesses(remote = [], local = []) {
  const map = new Map();
  for (const guess of [...(remote || []), ...(local || [])]) map.set(guessKey(guess), guess);
  return [...map.values()].sort((a, b) => (a.at || 0) - (b.at || 0));
}

export function mergeBoards(remote, local, base) {
  const safeRemote = remote || {};
  const safeLocal = local || {};
  const safeBase = base || {};
  return {
    games: mergeDeep(safeRemote.games, safeLocal.games, safeBase.games),
    spirit: mergeMaps(safeRemote.spirit, safeLocal.spirit, safeBase.spirit),
    word: {
      overrides: mergeMaps(safeRemote.word?.overrides, safeLocal.word?.overrides, safeBase.word?.overrides),
      winners: mergeMaps(safeRemote.word?.winners, safeLocal.word?.winners, safeBase.word?.winners)
    },
    guesses: mergeGuesses(safeRemote.guesses, safeLocal.guesses),
    pose: mergeDeep(safeRemote.pose, safeLocal.pose, safeBase.pose),
    bounties: mergeDeep(safeRemote.bounties, safeLocal.bounties, safeBase.bounties),
    votes: mergeDeep(safeRemote.votes, safeLocal.votes, safeBase.votes),
    award: changed(safeLocal.award, safeBase.award) ? cleanAward(safeLocal.award) : cleanAward(safeRemote.award),
    revision: Number(safeRemote.revision) || 0,
    updatedAt: safeRemote.updatedAt || null
  };
}
