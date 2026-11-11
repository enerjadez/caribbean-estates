import { teams, notes, poses, bounties, games, groups, players, teamById, gameById } from "./house.js";
import { wordForDate } from "./words.js";
import { rankEntries, formatPoints } from "./score.js";
import { loadState, saveState, emptyState, sharedBoard, applyShared, mergeBoards } from "./store.js";
import { pullBoard, pushBoard } from "./cloud.js";

const PIN = "0000";
const view = { page: "home", gameId: null, group: "All", query: "", voter: null };
const drafts = { games: {}, spirit: null, pose: {} };
let state = loadState();
let base = sharedBoard(state);
let captainWait = null;
let pendingImport = null;
let cupStill = false;
let houseOpen = false;
let painted = false;
let publishing = false;
let chain = Promise.resolve();

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

function teamOptions(selected) {
  return teams.map((team) => `<option value="${team.id}" ${team.id === selected ? "selected" : ""}>${esc(team.name)}</option>`).join("");
}

function playerOptions() {
  return players().map((player) => `<option value="${player.id}">${esc(player.name)} · ${esc(player.teamName)}</option>`).join("");
}

function prettyDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function orderedTeams(cup, spice) {
  return [...teams].sort((a, b) => (cup[b.id] - cup[a.id]) || (spice[b.id] - spice[a.id]) || a.name.localeCompare(b.name));
}

function homeHtml() {
  const date = todayKey();
  const winner = state.word.winners?.[date];
  const pose = poseToday();
  const openBounty = bounties.find((bounty) => teams.some((team) => !state.bounties?.[bounty.id]?.[team.id]?.confirmed)) || bounties[0];
  const spirit = drafts.spirit || { ...(state.spirit || {}) };
  drafts.spirit = spirit;
  const cup = cupTotals();
  const spice = spiceTotals();
  const ordered = orderedTeams(cup, spice);
  const bestCup = cup[ordered[0].id];
  const bestSpice = spice[ordered[0].id];
  const holders = ordered.filter((team) => cup[team.id] === bestCup && spice[team.id] === bestSpice);
  const maxCup = Math.max(0, ...teams.map((team) => cup[team.id]));
  let leader = "The cup is empty. The first game fills it.";
  if (bestCup > 0 && holders.length === 1) leader = `${holders[0].name} holds the cup.`;
  if (bestCup > 0 && holders.length > 1) leader = `${holders.map((team) => team.name).join(" and ")} share the cup.`;
  const liquids = teams.map((team) => {
    const height = maxCup === 0 ? 0 : Math.round((cup[team.id] / maxCup) * 100);
    return `<i class="liquid" style="--h:${height}%;--liquid:${team.colour}"></i>`;
  }).join("");
  const legend = teams.map((team) => `<li><i class="swatch" style="background:${team.colour}"></i>${esc(team.name)} ${formatPoints(cup[team.id])}</li>`).join("");
  const cards = ordered.map((team) => {
    const holding = bestCup > 0 && holders.some((holder) => holder.id === team.id);
    const place = bestCup === 0 ? "—" : String(ordered.findIndex((item) => cup[item.id] === cup[team.id] && spice[item.id] === spice[team.id]) + 1);
    const ribbon = !holding ? "" : holders.length > 1 ? "Shares the cup" : "Holds the cup";
    return `
      <article class="crest${holding ? " is-holding" : ""}" style="--c:${team.colour};--ink:${team.ink}">
        <img src="${team.crest}" alt="${esc(team.name)} medallion" width="1024" height="1024" loading="lazy">
        <hgroup>
          <p class="place">${place}</p>
          <h3>${esc(team.name)}</h3>
          ${ribbon ? `<p class="ribbon">${ribbon}</p>` : ""}
        </hgroup>
        <div>
          <p class="scoreline"><b>${formatPoints(cup[team.id])}</b> cup · ${formatPoints(spice[team.id])} spice</p>
          <ol class="roster">${team.players.map((player) => `<li>${esc(player.name)}</li>`).join("")}</ol>
        </div>
      </article>`;
  }).join("");
  const todayVotes = state.votes?.[date] || {};
  const chosen = view.voter ? todayVotes[view.voter] : "";
  const voteGroups = groups.filter((group) => group !== "All").map((group) => {
    const options = games.filter((game) => game.group === group).map((game) => `<option value="${game.id}" ${game.id === chosen ? "selected" : ""}>${esc(game.name)}</option>`).join("");
    return `<optgroup label="${esc(group)}">${options}</optgroup>`;
  }).join("");
  const counts = {};
  for (const gameId of Object.values(todayVotes)) counts[gameId] = (counts[gameId] || 0) + 1;
  const tally = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const tallyHtml = tally.length
    ? `<ul class="tally">${tally.map(([id, count]) => `<li><span>${esc(gameById(id)?.name || id)}</span><b>${count}</b></li>`).join("")}</ul>`
    : `<p class="hint">No votes yet. The loudest idea can start.</p>`;
  const voters = teams.map((team) => `
    <div class="team-voters">
      <p>${esc(team.name)}</p>
      <div class="voter-row">
        ${team.players.map((player) => `<button class="voter${view.voter === player.id ? " on" : ""}" type="button" data-voter="${player.id}" aria-pressed="${view.voter === player.id}" style="--c:${team.colour};--on:${team.ink}">${esc(player.name)}${todayVotes[player.id] ? " · in" : ""}</button>`).join("")}
      </div>
    </div>`).join("");
  return `
    <section class="hero${cupStill ? " is-still" : ""}">
      <img class="hero-photo" src="assets/veranda.jpg" alt="" width="1280" height="720" fetchpriority="high">
      <div class="hero-veil">
        <p class="kicker">Port Edward · ${esc(prettyDate(date))}</p>
        <h2>The Cup</h2>
        <p class="leader-line">${esc(leader)}</p>
        <p class="live-note">One link. Every phone sees this cup.</p>
        <div class="cup-scene">
          <div class="motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <button type="button" class="ghost" id="cup-pause">${cupStill ? "Turn the cup" : "Pause the cup"}</button>
          <div class="cup-rig" aria-hidden="true">
            <div class="bowl"><div class="liquids">${liquids}</div></div>
            <div class="stem"></div>
            <div class="foot"></div>
          </div>
        </div>
        <ul class="cup-legend">${legend}</ul>
      </div>
    </section>
    <h2 id="teams-title" class="section-title">The teams</h2>
    <section class="crest-grid" aria-labelledby="teams-title">${cards}</section>
    <h2 id="open-title" class="section-title">Today</h2>
    <section class="lanterns" aria-labelledby="open-title">
      <button class="lantern" type="button" data-tab="quests"><b>Daily word</b><span>${winner ? `${esc(winner.name)} got it` : "Still a secret"}</span></button>
      <button class="lantern" type="button" data-tab="quests"><b>${esc(pose.name)}</b><span>${esc(pose.seated)}</span></button>
      <button class="lantern" type="button" data-tab="quests"><b>${esc(openBounty.name)}</b><span>Photo bounty · 2 spice</span></button>
    </section>
    <section class="council" id="vote" aria-labelledby="vote-title">
      <h2 id="vote-title" class="section-title">What shall we play</h2>
      <p class="hint">${esc(prettyDate(date))}. Tap your name, then pick a game. You can change it. No captain code.</p>
      ${voters}
      <div class="field">
        <label for="vote-game">The game</label>
        <select id="vote-game" name="game">
          <option value="" ${chosen ? "" : "selected"}>Choose a game</option>
          ${voteGroups}
        </select>
      </div>
      <p class="hint" id="vote-hint" role="status"></p>
      ${tallyHtml}
    </section>
    <details class="panel house"${houseOpen ? " open" : ""}>
      <summary>The house book</summary>
      <ul class="notes">${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>
      <p class="hint">Spice stays off the cup and breaks a tie. Photos stay on the phone that took them. Export a backup any time.</p>
      <div class="actions">
        <button class="gold" type="button" id="export-board">Export board</button>
        <label class="ghost" style="display:inline-flex;align-items:center;padding:0 16px;cursor:pointer">Import board
          <input id="import-file" type="file" accept="application/json" hidden>
        </label>
      </div>
      <form id="spirit-form" aria-labelledby="spirit-title">
        <h3 id="spirit-title">Spirit bonus</h3>
        <p class="hint">Optional. 0 to 3 cup points, for looking after each other.</p>
        <div class="team-grid">
          ${teams.map((team) => `<div class="field"><label for="spirit-${team.id}">${esc(team.name)}</label><input id="spirit-${team.id}" name="${team.id}" inputmode="numeric" maxlength="1" data-spirit="${team.id}" value="${esc(spirit[team.id] ?? "")}"></div>`).join("")}
        </div>
        <button class="gold" type="submit">Save spirit</button>
      </form>
    </details>`;
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

function setSync(message) {
  const status = document.querySelector("#sync-status");
  if (status) status.textContent = message;
}

function render() {
  const paint = () => {
    captainBtn.textContent = isCaptain() ? "Lock" : "Captain";
    document.body.classList.toggle("at-home", view.page === "home");
    if (view.page === "home") viewRoot.innerHTML = homeHtml();
    else if (view.page === "games") viewRoot.innerHTML = gamesHtml();
    else if (view.page === "quests") viewRoot.innerHTML = questsHtml();
    else viewRoot.innerHTML = gameHtml(view.gameId);
    const current = view.page === "game" ? "games" : view.page;
    document.querySelectorAll("nav [data-tab]").forEach((button) => {
      const on = button.dataset.tab === current;
      button.classList.toggle("on", on);
      button.setAttribute("aria-current", on ? "page" : "false");
    });
    if (view.page === "games") applyFilters();
    if (view.page === "home") bindHome();
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (painted && !reduce && document.startViewTransition) {
    try {
      document.startViewTransition(paint);
      return;
    } catch {
      paint();
      return;
    }
  }
  paint();
  painted = true;
}

function bindHome() {
  const hero = document.querySelector(".hero");
  const button = document.querySelector("#cup-pause");
  button?.addEventListener("click", () => {
    cupStill = !cupStill;
    hero?.classList.toggle("is-still", cupStill);
    button.textContent = cupStill ? "Turn the cup" : "Pause the cup";
  });
  document.querySelector(".house")?.addEventListener("toggle", (event) => {
    houseOpen = event.currentTarget.open;
  });
  const fine = window.matchMedia("(pointer: fine)").matches;
  const motion = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const grid = document.querySelector(".crest-grid");
  if (!fine || !motion || !grid) return;
  grid.addEventListener("pointermove", (event) => {
    const card = event.target.closest(".crest");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--ry", `${(px * 14).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`);
  });
  grid.addEventListener("pointerleave", () => {
    grid.querySelectorAll(".crest").forEach((card) => {
      card.style.removeProperty("--ry");
      card.style.removeProperty("--rx");
    });
  });
}

function publish(replace = false) {
  const job = chain.then(() => writeThrough(replace));
  chain = job.catch(() => false);
  return job;
}

async function writeThrough(replace) {
  publishing = true;
  try {
    let remote;
    try {
      remote = await pullBoard();
    } catch {
      setSync("Saved on this phone. The shared link did not answer.");
      return false;
    }
    const before = JSON.stringify(sharedBoard(state));
    const local = JSON.parse(before);
    const merged = replace ? local : mergeBoards(remote, local, base);
    merged.revision = (Number(remote.revision) || 0) + 1;
    merged.updatedAt = new Date().toISOString();
    try {
      await pushBoard(merged);
    } catch {
      setSync("Saved on this phone. The shared link did not update.");
      return false;
    }
    if (JSON.stringify(sharedBoard(state)) !== before) return true;
    applyShared(state, merged);
    base = sharedBoard(state);
    saveState(state);
    setSync("Live for every phone on this link.");
    return true;
  } finally {
    publishing = false;
  }
}

async function refresh() {
  if (publishing || document.hidden) return;
  let remote;
  try {
    remote = await pullBoard();
  } catch {
    return;
  }
  if ((Number(remote.revision) || 0) <= (Number(state.revision) || 0)) return;
  if (JSON.stringify(sharedBoard(state)) !== JSON.stringify(base)) return;
  applyShared(state, remote);
  base = sharedBoard(state);
  saveState(state);
  setSync("Live for every phone on this link.");
  const active = document.activeElement;
  const typing = active && viewRoot.contains(active) && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);
  if (!typing) render();
}

async function boot() {
  render();
  setSync("Opening the shared board…");
  try {
    const remote = await pullBoard();
    const remoteRev = Number(remote.revision) || 0;
    const localRev = Number(state.revision) || 0;
    const localHas = Object.keys(state.games || {}).length || (state.guesses || []).length || Object.keys(state.votes || {}).length;
    if (remoteRev > localRev && localHas && !state.updatedAt) {
      applyShared(state, mergeBoards(remote, sharedBoard(state), remote));
      base = remote;
      saveState(state);
      setSync("This phone had a private copy. A captain save shares it.");
      render();
    } else if (remoteRev > localRev || (remoteRev === localRev && remote.updatedAt && remote.updatedAt !== state.updatedAt)) {
      applyShared(state, remote);
      base = sharedBoard(state);
      saveState(state);
      setSync("Live for every phone on this link.");
      render();
    } else if (localRev > remoteRev) {
      base = remote;
      setSync("This phone is ahead. A captain save shares it.");
    } else {
      base = sharedBoard(state);
      setSync("Live for every phone on this link.");
    }
  } catch {
    setSync("The shared link is quiet. Showing this phone.");
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });
  setInterval(() => {
    if (!document.hidden) refresh();
  }, 15000);
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
    publish(true);
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
    return;
  }
  const voter = event.target.closest("[data-voter]");
  if (voter && view.page === "home") {
    view.voter = voter.dataset.voter;
    render();
    document.querySelector(`[data-voter="${CSS.escape(view.voter)}"]`)?.focus();
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
    if (status) status.textContent = "Saving to the shared link…";
    const saved = await publish();
    if (status) status.textContent = saved ? "Saved. Every phone on this link can see it." : "Saved on this phone. The shared link did not update.";
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
    publish();
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
    publish();
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
    publish();
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
    publish();
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
    publish();
    render();
  }
});

viewRoot.addEventListener("change", async (event) => {
  if (event.target.id === "vote-game") {
    const hint = document.querySelector("#vote-hint");
    if (!view.voter) {
      if (hint) hint.textContent = "Tap your name first.";
      event.target.value = "";
      return;
    }
    const gameId = event.target.value;
    if (!gameId) return;
    const date = todayKey();
    state.votes[date] = { ...(state.votes[date] || {}) };
    state.votes[date][view.voter] = gameId;
    saveState(state);
    publish();
    render();
    return;
  }
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
    publish();
    render();
  }
});

boot();
