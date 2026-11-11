import { teams, notes, poses, bounties, games, groups, players, teamById, gameById } from "./house.js";
import { wordForDate } from "./words.js";
import { rankEntries, formatPoints } from "./score.js";
import { loadState, saveState, emptyState } from "./store.js";

const PIN = "0000";
const view = { page: "home", gameId: null, group: "All", query: "" };
const drafts = { games: {}, spirit: null, pose: {} };
let state = loadState();
let captainWait = null;
let pendingImport = null;

const viewRoot = document.querySelector("#view");
const pinDialog = document.querySelector("#pin-dialog");
const pinForm = document.querySelector("#pin-form");
const pinInput = document.querySelector("#pin");
const pinError = document.querySelector("#pin-error");
const importDialog = document.querySelector("#import-dialog");
const captainBtn = document.querySelector("#captain-btn");

function todayKey() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isCaptain() {
  return sessionStorage.getItem("ce-captain") === "1";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function secretWord(date = todayKey()) {
  return state.word.overrides?.[date] || wordForDate(date);
}

function poseToday() {
  const index = Math.abs(todayKey().split("-").reduce((sum, part) => sum + Number(part), 0)) % poses.length;
  return poses[index];
}

function cupTotals() {
  const totals = Object.fromEntries(teams.map((team) => [team.id, 0]));
  for (const game of games) {
    const saved = state.games[game.id] || {};
    if (game.entry === "points") {
      for (const team of teams) {
        if (saved[team.id] === "" || saved[team.id] == null) continue;
        const points = Number(saved[team.id]);
        if (!Number.isNaN(points)) totals[team.id] += points;
      }
    } else {
      const ranked = rankEntries(teams.map((team) => ({ teamId: team.id, raw: saved[team.id] })), game.higher !== false);
      for (const [teamId, info] of Object.entries(ranked)) totals[teamId] += info.points;
    }
  }
  for (const team of teams) totals[team.id] += Number(state.spirit?.[team.id] || 0);
  for (const winner of Object.values(state.word.winners || {})) {
    if (winner?.teamId && totals[winner.teamId] != null) totals[winner.teamId] += 4;
  }
  return totals;
}

function spiceTotals() {
  const totals = Object.fromEntries(teams.map((team) => [team.id, 0]));
  for (const byTeam of Object.values(state.pose || {})) {
    for (const [teamId, seconds] of Object.entries(byTeam || {})) {
      if (totals[teamId] == null) continue;
      totals[teamId] += Math.min(3, Math.floor(Number(seconds) / 10) || 0);
    }
  }
  for (const bounty of bounties) {
    const row = state.bounties?.[bounty.id] || {};
    for (const team of teams) {
      if (row[team.id]?.confirmed) totals[team.id] += 2;
    }
  }
  return totals;
}

function bars(totals) {
  const max = Math.max(1, ...teams.map((team) => totals[team.id] || 0));
  return teams.map((team) => {
    const value = totals[team.id] || 0;
    const width = Math.round((value / max) * 100);
    return `<div class="bar-row"><span>${esc(team.name)}</span><div class="bar" role="img" aria-label="${esc(team.name)} ${formatPoints(value)}"><i style="width:${width}%;background:${team.colour}"></i></div><b>${formatPoints(value)}</b></div>`;
  }).join("");
}

function teamOptions(selected) {
  return teams.map((team) => `<option value="${team.id}" ${team.id === selected ? "selected" : ""}>${esc(team.name)}</option>`).join("");
}

function playerOptions() {
  return players().map((player) => `<option value="${player.id}">${esc(player.name)} · ${esc(player.teamName)}</option>`).join("");
}

function homeHtml() {
  const date = todayKey();
  const winner = state.word.winners?.[date];
  const pose = poseToday();
  const openBounty = bounties.find((bounty) => teams.some((team) => !state.bounties?.[bounty.id]?.[team.id]?.confirmed)) || bounties[0];
  const spirit = drafts.spirit || { ...(state.spirit || {}) };
  drafts.spirit = spirit;
  return `
    <section class="panel" aria-labelledby="cup-title">
      <h2 id="cup-title">Cup</h2>
      <p class="hint">Games and the daily word. Sample numbers are gone. This phone starts at zero.</p>
      ${bars(cupTotals())}
    </section>
    <section class="panel" aria-labelledby="spice-title">
      <h2 id="spice-title">Spice</h2>
      <p class="hint">Poses and photo bounties. Spice stays off the cup, and breaks a tie.</p>
      ${bars(spiceTotals())}
    </section>
    <section class="panel" aria-labelledby="open-title">
      <h2 id="open-title">Still open today</h2>
      <div class="glimpse">
        <button class="tile" type="button" data-tab="quests"><b>Daily word</b><span>${winner ? `${esc(winner.name)} got it` : "No winner yet"}</span></button>
        <button class="tile" type="button" data-tab="quests"><b>${esc(pose.name)}</b><span>${esc(pose.seated)}</span></button>
        <button class="tile" type="button" data-tab="quests"><b>${esc(openBounty.name)}</b><span>Photo bounty · 2 spice</span></button>
      </div>
    </section>
    <section class="panel">
      <h2>The house</h2>
      <ul class="notes">${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>
      <p class="hint">Scores live on this phone. Export a file before you switch devices.</p>
      <div class="actions">
        <button class="gold" type="button" id="export-board">Export board</button>
        <label class="ghost" style="display:inline-flex;align-items:center;padding:0 16px;cursor:pointer">Import board
          <input id="import-file" type="file" accept="application/json" hidden>
        </label>
      </div>
    </section>
    <form class="panel" id="spirit-form" aria-labelledby="spirit-title">
      <h2 id="spirit-title">Spirit bonus</h2>
      <p class="hint">Optional. 0 to 3 cup points at the end, for looking after each other.</p>
      <div class="team-grid">
        ${teams.map((team) => `<div class="field"><label for="spirit-${team.id}">${esc(team.name)}</label><input id="spirit-${team.id}" name="${team.id}" inputmode="numeric" maxlength="1" data-spirit="${team.id}" value="${esc(spirit[team.id] ?? "")}"></div>`).join("")}
      </div>
      <button class="gold" type="submit">Save spirit</button>
    </form>`;
}

function gamesHtml() {
  return `
    <section aria-labelledby="games-title">
      <h2 id="games-title">Library</h2>
      <p class="lede">Open one when you want it. Nothing is pinned to a date. The count you write becomes 4, 3, 2, 1.</p>
      <search class="search">
        <form id="game-find" aria-labelledby="games-title">
          <label for="game-search">Find a game</label>
          <input id="game-search" type="search" name="q" value="${esc(view.query)}" enterkeyhint="search">
        </form>
      </search>
      <div class="chips" role="toolbar" aria-label="Game groups">
        ${groups.map((group) => `<button class="chip ${view.group === group ? "on" : ""}" type="button" data-group="${esc(group)}" aria-pressed="${view.group === group}">${esc(group)}</button>`).join("")}
      </div>
      <ul class="library">
        ${games.map((game) => `<li data-game-row="${game.id}"><button type="button" data-open="${game.id}"><b>${esc(game.name)}</b><span>${esc(game.blurb)}</span></button></li>`).join("")}
      </ul>
      <p class="hint" id="game-empty" hidden>Nothing in the library matches that.</p>
    </section>`;
}

function previewText(game, draft) {
  if (game.entry === "points") {
    return teams.map((team) => {
      const raw = draft[team.id];
      return `${team.name} ${raw === "" || raw == null ? "—" : formatPoints(Number(raw))}`;
    }).join(" · ");
  }
  const ranked = rankEntries(teams.map((team) => ({ teamId: team.id, raw: draft[team.id] })), game.higher !== false);
  return teams.map((team) => {
    const info = ranked[team.id];
    if (!info) return `${team.name} —`;
    const tie = info.tied ? ", tied" : "";
    return `${team.name} ${info.place}${tie} (${formatPoints(info.points)})`;
  }).join(" · ");
}

function gameHtml(id) {
  const game = gameById(id);
  if (!game) return `<p>That game is not in the library.</p>`;
  if (!drafts.games[id]) drafts.games[id] = { ...(state.games[id] || {}) };
  const draft = drafts.games[id];
  const sense = game.entry === "points" ? "Type the cup points." : game.higher === false ? "Lower wins. Places pay 4, 3, 2, 1. A tie splits." : "Higher wins. Places pay 4, 3, 2, 1. A tie splits.";
  return `
    <button class="ghost back" type="button" data-tab="games">All games</button>
    <h2 id="game-title">${esc(game.name)}</h2>
    <p class="rules">${esc(game.how)}</p>
    <p class="hint">${esc(sense)}</p>
    <form id="score-form" aria-labelledby="game-title">
      <div class="team-grid">
        ${teams.map((team) => `<div class="field"><label for="raw-${team.id}"><i class="swatch" style="background:${team.colour}"></i>${esc(team.name)}, ${esc(game.unit.toLowerCase())}</label><input id="raw-${team.id}" name="${team.id}" inputmode="decimal" data-raw="${team.id}" value="${esc(draft[team.id] ?? "")}"></div>`).join("")}
      </div>
      <p id="rank-preview" aria-live="polite">${esc(previewText(game, draft))}</p>
      <div class="actions">
        <button class="gold" type="submit">Save scores</button>
        <button class="ghost" type="button" id="clear-game">Clear</button>
      </div>
      <p class="hint" id="save-status" role="status"></p>
    </form>`;
}

function questsHtml() {
  const date = todayKey();
  const pose = poseToday();
  const winner = state.word.winners?.[date];
  const guesses = (state.guesses || []).filter((guess) => guess.date === date);
  if (!drafts.pose[date]) drafts.pose[date] = { ...(state.pose?.[date] || {}) };
  const poseDraft = drafts.pose[date];
  return `
    <section class="panel" aria-labelledby="word-title">
      <h2 id="word-title">Daily word</h2>
      <p class="hint">${winner ? `${esc(winner.name)} hit it. The word was ${esc(secretWord(date))}. Their team takes 4 cup points.` : "One secret word today. The first exact guess puts 4 cup points on that player's team."}</p>
      ${winner ? "" : `<form id="guess-form" aria-labelledby="word-title">
        <div class="field"><label for="guesser">Who is guessing</label><select id="guesser" name="player" required>${playerOptions()}</select></div>
        <div class="field"><label for="guess">Guess</label><input id="guess" name="guess" autocomplete="off" autocapitalize="none" required></div>
        <button class="gold" type="submit">Send guess</button>
        <p class="hint" id="guess-hint" role="status"></p>
      </form>`}
      ${guesses.map((guess) => `<p class="line"><span>${esc(guess.name)}</span><span>${esc(guess.text)}</span><span>${esc(guess.hint || "")}</span></p>`).join("")}
      <form id="word-form" aria-labelledby="word-set-title">
        <h3 id="word-set-title">Set today's word</h3>
        <div class="field"><label for="override-word">Captain's word</label><input id="override-word" name="word" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
        <button class="ghost" type="submit">Save word</button>
      </form>
    </section>
    <form class="panel" id="pose-form" aria-labelledby="pose-title">
      <h2 id="pose-title">${esc(pose.name)}</h2>
      <p class="hint">Seated swap: ${esc(pose.seated)}. One spice for every 10 clean seconds, up to 3. Captain saves it.</p>
      <div class="team-grid">
        ${teams.map((team) => `<div class="field"><label for="pose-${team.id}">${esc(team.name)}, seconds</label><input id="pose-${team.id}" name="${team.id}" inputmode="numeric" data-pose="${team.id}" value="${esc(poseDraft[team.id] ?? "")}"></div>`).join("")}
      </div>
      <p id="pose-preview" aria-live="polite">${esc(posePreview(poseDraft))}</p>
      <button class="gold" type="submit">Save pose</button>
    </form>
    <section aria-labelledby="bounty-title">
      <h2 id="bounty-title">Photo bounties</h2>
      <p class="lede">Anyone can take the photo. The captain confirms it, once per team, for 2 spice.</p>
      ${bounties.map((bounty) => bountyCard(bounty)).join("")}
    </section>`;
}

function posePreview(draft) {
  return teams.map((team) => {
    const spice = Math.min(3, Math.floor(Number(draft[team.id]) / 10) || 0);
    return `${team.name} ${spice} spice`;
  }).join(" · ");
}

function bountyCard(bounty) {
  const row = state.bounties?.[bounty.id] || {};
  const dots = teams.map((team) => {
    const cell = row[team.id];
    const label = cell?.confirmed ? "confirmed" : cell?.photo ? "photo in" : "open";
    return `<span>${esc(team.name)} ${label}</span>`;
  }).join(" · ");
  const shown = teams.map((team) => row[team.id]?.photo).find(Boolean);
  return `
    <article class="card">
      <div class="bounty-head"><h3>${esc(bounty.name)}</h3><span></span><span class="status">2 spice</span></div>
      <p class="hint">${esc(bounty.detail)}</p>
      <p class="hint">${dots}</p>
      ${shown ? `<img class="shot" alt="" src="${shown}">` : ""}
      <form data-bounty="${bounty.id}">
        <div class="field"><label for="team-${bounty.id}">Team</label><select id="team-${bounty.id}" name="team">${teamOptions()}</select></div>
        <div class="field"><label for="file-${bounty.id}">Photo</label><input id="file-${bounty.id}" name="photo" type="file" accept="image/*" capture="environment"></div>
        <button class="gold" type="submit">Confirm 2 spice</button>
      </form>
    </article>`;
}

function render() {
  captainBtn.textContent = isCaptain() ? "Lock" : "Captain";
  if (view.page === "home") viewRoot.innerHTML = homeHtml();
  else if (view.page === "games") viewRoot.innerHTML = gamesHtml();
  else if (view.page === "quests") viewRoot.innerHTML = questsHtml();
  else viewRoot.innerHTML = gameHtml(view.gameId);
  const current = view.page === "game" ? "games" : view.page;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const on = button.dataset.tab === current;
    button.classList.toggle("on", on);
    button.setAttribute("aria-current", on ? "page" : "false");
  });
  if (view.page === "games") applyFilters();
}

function applyFilters() {
  const query = view.query.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll("[data-game-row]").forEach((row) => {
    const game = gameById(row.dataset.gameRow);
    const groupOk = view.group === "All" || game.group === view.group;
    const textOk = !query || `${game.name} ${game.blurb}`.toLowerCase().includes(query);
    row.hidden = !(groupOk && textOk);
    if (!row.hidden) shown += 1;
  });
  const empty = document.querySelector("#game-empty");
  if (empty) empty.hidden = shown !== 0;
}

function ensureCaptain() {
  if (isCaptain()) return Promise.resolve(true);
  pinError.hidden = true;
  pinInput.value = "";
  pinInput.removeAttribute("aria-invalid");
  pinDialog.showModal();
  pinInput.focus();
  return new Promise((resolve) => {
    captainWait = resolve;
  });
}

function guessHint(guess, word) {
  if (guess === word) return "Exact.";
  if (guess[0] && guess[0] === word[0]) return "Same first letter.";
  if (guess.length === word.length) return "Same length.";
  return guess.length > word.length ? "Shorter than that." : "Longer than that.";
}

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.62));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("photo"));
    };
    image.src = url;
  });
}

async function rememberPhoto(bountyId, teamId, file) {
  const photo = await compressPhoto(file);
  state.bounties[bountyId] = state.bounties[bountyId] || {};
  const previous = state.bounties[bountyId][teamId] || {};
  state.bounties[bountyId][teamId] = { ...previous, photo, confirmed: false };
  try {
    saveState(state);
  } catch {
    state.bounties[bountyId][teamId] = previous;
    throw new Error("quota");
  }
}

captainBtn.addEventListener("click", () => {
  if (isCaptain()) {
    sessionStorage.removeItem("ce-captain");
    render();
    return;
  }
  ensureCaptain().then(() => render());
});

pinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pinInput.value.trim() === PIN) {
    sessionStorage.setItem("ce-captain", "1");
    pinDialog.close();
    return;
  }
  pinError.hidden = false;
  pinError.textContent = "That code does not open the board.";
  pinInput.setAttribute("aria-invalid", "true");
  pinInput.focus();
});

document.querySelector("#pin-cancel").addEventListener("click", () => pinDialog.close());

pinDialog.addEventListener("close", () => {
  captainWait?.(isCaptain());
  captainWait = null;
  pinDialog.returnValue = "";
});

if (!("closedBy" in HTMLDialogElement.prototype)) {
  let pressedOutside = false;
  const outside = (event) => {
    const rect = pinDialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  pinDialog.addEventListener("pointerdown", (event) => {
    pressedOutside = outside(event);
  });
  pinDialog.addEventListener("pointerup", (event) => {
    if (pressedOutside && outside(event)) pinDialog.close();
  });
}

importDialog.addEventListener("close", () => {
  if (importDialog.returnValue === "replace" && pendingImport) {
    state = {
      ...emptyState(),
      ...pendingImport,
      word: { ...emptyState().word, ...(pendingImport.word || {}) }
    };
    drafts.games = {};
    drafts.spirit = null;
    drafts.pose = {};
    saveState(state);
    render();
  }
  pendingImport = null;
  importDialog.returnValue = "";
});

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    view.page = tab.dataset.tab;
    view.gameId = null;
    render();
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) {
    view.page = "game";
    view.gameId = open.dataset.open;
    render();
    return;
  }
  const group = event.target.closest("[data-group]");
  if (group) {
    view.group = group.dataset.group;
    render();
  }
});

viewRoot.addEventListener("input", (event) => {
  if (event.target.id === "game-search") {
    view.query = event.target.value;
    applyFilters();
    return;
  }
  const raw = event.target.dataset.raw;
  if (raw && view.gameId) {
    drafts.games[view.gameId][raw] = event.target.value;
    const preview = document.querySelector("#rank-preview");
    if (preview) preview.textContent = previewText(gameById(view.gameId), drafts.games[view.gameId]);
  }
  const spirit = event.target.dataset.spirit;
  if (spirit) drafts.spirit[spirit] = event.target.value;
  const pose = event.target.dataset.pose;
  if (pose) {
    drafts.pose[todayKey()][pose] = event.target.value;
    const preview = document.querySelector("#pose-preview");
    if (preview) preview.textContent = posePreview(drafts.pose[todayKey()]);
  }
});

viewRoot.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.id === "game-find") {
    event.preventDefault();
    return;
  }
  if (form.id === "score-form") {
    event.preventDefault();
    if (!(await ensureCaptain())) return;
    state.games[view.gameId] = { ...drafts.games[view.gameId] };
    saveState(state);
    const status = document.querySelector("#save-status");
    if (status) status.textContent = "Saved on this phone.";
    return;
  }
  if (form.id === "spirit-form") {
    event.preventDefault();
    if (!(await ensureCaptain())) return;
    const next = {};
    for (const team of teams) {
      const value = Number(drafts.spirit?.[team.id]);
      if (!Number.isNaN(value)) next[team.id] = Math.min(3, Math.max(0, value));
    }
    state.spirit = next;
    drafts.spirit = { ...next };
    saveState(state);
    render();
    return;
  }
  if (form.id === "guess-form") {
    event.preventDefault();
    const data = new FormData(form);
    const player = players().find((item) => item.id === data.get("player"));
    const text = String(data.get("guess") || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    const hint = document.querySelector("#guess-hint");
    if (!player || !text) return;
    const date = todayKey();
    if (state.word.winners?.[date]) return;
    const word = secretWord(date);
    const hintText = guessHint(text, word);
    state.guesses.push({ date, playerId: player.id, name: player.name, teamId: player.teamId, text, hint: hintText, at: Date.now() });
    if (text === word) state.word.winners[date] = { playerId: player.id, name: player.name, teamId: player.teamId };
    saveState(state);
    if (hint && text !== word) {
      hint.textContent = hintText;
      form.querySelector("#guess").value = "";
      const list = document.createElement("p");
      list.className = "line";
      list.innerHTML = `<span>${esc(player.name)}</span><span>${esc(text)}</span><span>${esc(hintText)}</span>`;
      form.after(list);
      return;
    }
    render();
    return;
  }
  if (form.id === "word-form") {
    event.preventDefault();
    if (!(await ensureCaptain())) return;
    const word = new FormData(form).get("word").toString().trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return;
    const date = todayKey();
    state.word.overrides[date] = word;
    delete state.word.winners[date];
    saveState(state);
    render();
    return;
  }
  if (form.id === "pose-form") {
    event.preventDefault();
    if (!(await ensureCaptain())) return;
    const date = todayKey();
    const next = {};
    for (const team of teams) {
      const value = drafts.pose[date]?.[team.id];
      if (value === "" || value == null) continue;
      const seconds = Number(value);
      if (!Number.isNaN(seconds)) next[team.id] = Math.max(0, Math.round(seconds));
    }
    state.pose[date] = next;
    saveState(state);
    render();
    return;
  }
  const bountyId = form.dataset.bounty;
  if (bountyId) {
    event.preventDefault();
    if (!(await ensureCaptain())) return;
    const teamId = new FormData(form).get("team");
    const cell = state.bounties?.[bountyId]?.[teamId];
    if (!cell?.photo) {
      form.insertAdjacentHTML("beforeend", `<p class="hint">Take the photo first.</p>`);
      return;
    }
    if (cell.confirmed) return;
    cell.confirmed = true;
    saveState(state);
    render();
  }
});

viewRoot.addEventListener("change", async (event) => {
  if (event.target.id === "import-file") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(await ensureCaptain())) return;
    try {
      pendingImport = JSON.parse(await file.text());
    } catch {
      pendingImport = null;
      return;
    }
    importDialog.showModal();
    return;
  }
  if (event.target.type === "file" && event.target.form?.dataset.bounty) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bountyId = event.target.form.dataset.bounty;
    const teamId = new FormData(event.target.form).get("team");
    try {
      await rememberPhoto(bountyId, teamId, file);
      render();
    } catch {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "That photo could not be stored on this phone.";
      event.target.form.append(note);
    }
  }
});

viewRoot.addEventListener("click", async (event) => {
  if (event.target.id === "export-board") {
    if (!(await ensureCaptain())) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "caribbean-estates-board.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  if (event.target.id === "clear-game" && view.gameId) {
    if (!(await ensureCaptain())) return;
    drafts.games[view.gameId] = {};
    state.games[view.gameId] = {};
    saveState(state);
    render();
  }
});

render();
