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
    questNotes: {},
    award: null,
    revision: 0,
    updatedAt: null
  };
}

function cleanNotes(notes) {
  const out = {};
  for (const [id, list] of Object.entries(notes || {})) {
    const next = [];
    for (const note of list || []) {
      const text = String(note?.text || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const name = String(note?.name || "").trim().slice(0, 40);
      if (!text || !name) continue;
      next.push({
        id: String(note.id || `${note.at || 0}-${name}`),
        name,
        teamId: String(note.teamId || ""),
        text,
        at: Number(note.at) || 0
      });
    }
    if (next.length) out[id] = next.slice(-12);
  }
  return out;
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
      questNotes: cleanNotes(parsed.questNotes),
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
        const share = {};
      if (cell?.confirmed) share.confirmed = true;
      if (cell?.posted || cell?.confirmed) share.posted = true;
      const caption = String(cell?.caption || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (caption) share.caption = caption;
      if (Object.keys(share).length) next[teamId] = share;
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
    questNotes: cleanNotes(state.questNotes),
    award: cleanAward(state.award),
    revision: Number(state.revision) || 0,
    updatedAt: state.updatedAt || null
  });
}

export function applyShared(state, board) {
  const localMedia = {};
  for (const [id, row] of Object.entries(state.bounties || {})) {
    for (const [teamId, cell] of Object.entries(row || {})) {
      if (!cell?.photo && !cell?.video) continue;
      localMedia[id] = localMedia[id] || {};
      localMedia[id][teamId] = {};
      if (cell.photo) localMedia[id][teamId].photo = cell.photo;
      if (cell.video) localMedia[id][teamId].video = true;
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
  state.questNotes = cleanNotes(board.questNotes);
  state.award = cleanAward(board.award);
  state.bounties = {};
  for (const [id, row] of Object.entries(board.bounties || {})) {
    state.bounties[id] = {};
    for (const [teamId, cell] of Object.entries(row || {})) {
      const caption = String(cell?.caption || "").trim();
      state.bounties[id][teamId] = {
        confirmed: !!cell?.confirmed,
        posted: !!(cell?.posted || cell?.confirmed),
        ...(caption ? { caption } : {})
      };
    }
  }
  for (const [id, row] of Object.entries(localMedia)) {
    state.bounties[id] = state.bounties[id] || {};
    for (const [teamId, media] of Object.entries(row)) {
      const cell = state.bounties[id][teamId] || { confirmed: false, posted: true };
      state.bounties[id][teamId] = { ...cell, ...media, posted: true };
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

function mergeNoteLists(remote = [], local = []) {
  const map = new Map();
  for (const note of [...(remote || []), ...(local || [])]) {
    if (!note?.id || !note.text) continue;
    map.set(String(note.id), note);
  }
  return [...map.values()].sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-12);
}

function mergeNoteMap(remote = {}, local = {}) {
  const keys = new Set([...Object.keys(remote || {}), ...Object.keys(local || {})]);
  const out = {};
  for (const key of keys) {
    const list = mergeNoteLists(remote?.[key], local?.[key]);
    if (list.length) out[key] = list;
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
    questNotes: mergeNoteMap(safeRemote.questNotes, safeLocal.questNotes),
    award: changed(safeLocal.award, safeBase.award) ? cleanAward(safeLocal.award) : cleanAward(safeRemote.award),
    revision: Number(safeRemote.revision) || 0,
    updatedAt: safeRemote.updatedAt || null
  };
}
