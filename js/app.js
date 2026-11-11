import { teams, notes, poses, bounties, games, groups, players, teamById, gameById } from "./house.js?v=13";
import { wordForDate } from "./words.js";
import { rankEntries, formatPoints } from "./score.js";
import { loadState, saveState, emptyState, sharedBoard, applyShared, mergeBoards } from "./store.js?v=13";
import { pullBoard, pushBoard } from "./cloud.js";

const PIN = "0000";
const view = { page: "home", gameId: null, group: "All", query: "", voter: null, reading: null, poster: "" };
const drafts = { games: {}, spirit: null, pose: {} };
let state = loadState();
let base = sharedBoard(state);
let captainWait = null;
let pendingImport = null;
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
const crestDialog = document.querySelector("#crest-dialog");
const crestArt = document.querySelector("#crest-dialog-art");
const crestTitle = document.querySelector("#crest-dialog-title");
const crestPlace = document.querySelector("#crest-dialog-place");
const crestScore = document.querySelector("#crest-dialog-score");
const crestRoster = document.querySelector("#crest-dialog-roster");
const captainBtn = document.querySelector("#captain-btn");
const SKY_URL = "https://api.open-meteo.com/v1/forecast?latitude=-31.07645&longitude=30.19613&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Africa%2FJohannesburg&forecast_days=4";
const SKY_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let skyPromise = null;

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

function votesFor(date, playerId) {
  const raw = state.votes?.[date]?.[playerId];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.filter((id) => gameById(id));
}

function votePoll(date) {
  const rows = new Map();
  for (const player of players()) {
    for (const id of votesFor(date, player.id)) {
      const row = rows.get(id) || { id, name: gameById(id).name, count: 0, names: [] };
      row.count += 1;
      row.names.push(player.name);
      rows.set(id, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const VOTE_LIMIT = 3;

function fillVoteDialog(gameId) {
  const game = gameById(gameId);
  const dialog = document.querySelector("#vote-dialog");
  if (!game || !dialog) return;
  view.reading = gameId;
  document.querySelector("#vote-dialog-group").textContent = game.group;
  document.querySelector("#vote-dialog-title").textContent = game.name;
  document.querySelector("#vote-dialog-about").textContent = game.about || game.blurb;
  document.querySelector("#vote-dialog-how").textContent = game.how;
  const status = document.querySelector("#vote-dialog-status");
  const button = document.querySelector("#vote-toggle");
  const mine = view.voter ? votesFor(todayKey(), view.voter) : [];
  const picked = mine.includes(gameId);
  button.textContent = picked ? "Take my vote off" : "Vote to play this";
  if (!view.voter) status.textContent = "Tap your name on the page first.";
  else if (picked) status.textContent = "This is one of your three.";
  else if (mine.length >= VOTE_LIMIT) status.textContent = "Three games is the lot. Take one off to swap.";
  else status.textContent = `${mine.length} of ${VOTE_LIMIT} picked.`;
}

function castVote(gameId) {
  const status = document.querySelector("#vote-dialog-status");
  if (!view.voter) {
    if (status) status.textContent = "Tap your name on the page first.";
    return;
  }
  const date = todayKey();
  const mine = votesFor(date, view.voter);
  const picked = mine.includes(gameId);
  if (!picked && mine.length >= VOTE_LIMIT) {
    if (status) status.textContent = "Three games is the lot. Take one off to swap.";
    return;
  }
  const next = picked ? mine.filter((id) => id !== gameId) : [...mine, gameId];
  const day = { ...(state.votes[date] || {}) };
  if (next.length) day[view.voter] = next;
  else delete day[view.voter];
  state.votes[date] = day;
  saveState(state);
  publish();
  render();
  if (document.querySelector("#vote-dialog")?.open) fillVoteDialog(gameId);
}

function homeHtml() {
  const date = todayKey();
  const spirit = drafts.spirit || { ...(state.spirit || {}) };
  drafts.spirit = spirit;
  const cup = cupTotals();
  const spice = spiceTotals();
  const ordered = orderedTeams(cup, spice);
  const bestCup = cup[ordered[0].id];
  const bestSpice = spice[ordered[0].id];
  const holders = ordered.filter((team) => cup[team.id] === bestCup && spice[team.id] === bestSpice);
  const maxCup = Math.max(0, ...teams.map((team) => cup[team.id]));
  const award = currentAward();
  let leader = "";
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
    const file = award ? awardFile(team, award.winner) : null;
    const download = file ? `<a class="award-dl" href="${file.href}" download="${esc(file.download)}">${file.label}</a>` : "";
    return `
      <div class="crest-tilt">
        <article class="crest${holding ? " is-holding" : ""}" style="--c:${team.colour};--ink:${team.ink}">
          <button type="button" class="crest-open" data-crest="${team.id}">
            <img src="${team.crest}" alt="" width="1024" height="1024" loading="lazy">
            <span class="vh">${esc(team.name)} full screen</span>
          </button>
          <hgroup>
            <p class="place">${place}</p>
            <h3>${esc(team.name)}</h3>
            ${ribbon ? `<p class="ribbon">${ribbon}</p>` : ""}
          </hgroup>
          <div>
            <p class="scoreline"><b>${formatPoints(cup[team.id])}</b> cup · ${formatPoints(spice[team.id])} spice</p>
            <ol class="roster">${team.players.map((player) => `<li>${esc(player.name)}</li>`).join("")}</ol>
            ${download}
          </div>
        </article>
      </div>`;
  }).join("");
  const mine = view.voter ? votesFor(date, view.voter) : [];
  const poll = votePoll(date);
  const top = poll[0]?.count || 1;
  const voteGrid = groups.filter((group) => group !== "All").map((group) => {
    const cards = games.filter((game) => game.group === group).map((game) => {
      const picked = mine.includes(game.id);
      const count = poll.find((row) => row.id === game.id)?.count || 0;
      return `<button type="button" class="vote-card${picked ? " is-mine" : ""}" data-read="${game.id}">
        <b>${esc(game.name)}</b>
        <span>${esc(game.blurb)}</span>
        <i>${picked ? "In your vote" : "Read it"}${count ? ` · ${count}` : ""}</i>
      </button>`;
    }).join("");
    return `<h3>${esc(group)}</h3><div class="vote-cards">${cards}</div>`;
  }).join("");
  const pollHtml = poll.length
    ? `<ol class="poll">${poll.map((row) => `<li>
        <div class="poll-top"><span>${esc(row.name)}</span><b>${row.count}</b></div>
        <p>${esc(row.names.join(", "))}</p>
        <span class="poll-track"><i style="--w:${Math.round((row.count / top) * 100)}"></i></span>
      </li>`).join("")}</ol>`
    : `<p class="hint">No votes yet. Open a game and say you want it.</p>`;
  const voters = teams.map((team) => `
    <div class="team-voters">
      <p>${esc(team.name)}</p>
      <div class="voter-row">
        ${team.players.map((player) => {
          const count = votesFor(date, player.id).length;
          return `<button class="voter${view.voter === player.id ? " on" : ""}" type="button" data-voter="${player.id}" aria-pressed="${view.voter === player.id}" style="--c:${team.colour};--on:${team.ink}">${esc(player.name)}${count ? ` · ${count}` : ""}</button>`;
        }).join("")}
      </div>
    </div>`).join("");
  return `
    <section class="hero">
      <img class="hero-photo" src="assets/veranda.jpg" alt="" width="1280" height="720" fetchpriority="high">
      <div class="hero-veil">
        <p class="kicker">Port Edward · ${esc(prettyDate(date))}</p>
        <h2>The Cup</h2>
        ${leader ? `<p class="leader-line">${esc(leader)}</p>` : ""}
        <p class="prize-note">At the end of this tournament the winning team gets a Cup Winners 2026 trophy. Every other team gets a participation badge.</p>
        <div class="cup-scene">
          <div class="motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="cup-rig" aria-hidden="true">
            <div class="bowl"><div class="liquids">${liquids}</div></div>
            <div class="stem"></div>
            <div class="foot"></div>
          </div>
        </div>
        <ul class="cup-legend">${legend}</ul>
        <p class="sky" id="sky"><span class="sky-status" role="status">Coast…</span></p>
      </div>
    </section>
    <h2 id="teams-title" class="section-title">The teams</h2>
    <section class="crest-grid" aria-labelledby="teams-title">${cards}</section>
    <div class="award-actions">
      ${award ? `<p>${esc(award.team.name)} takes the Cup Winners 2026 trophy.</p><button type="button" class="gold" id="award-open">See the awards</button>` : `<p class="hint">The captain uses the code to end it.</p>`}
      <button type="button" class="ghost" id="award-end">${award ? "Choose a different winner" : "End the tournament"}</button>
    </div>
    <section class="council" id="vote" aria-labelledby="vote-title">
      <h2 id="vote-title" class="section-title">What shall we play</h2>
      <p class="hint">${esc(prettyDate(date))}. Tap your name. Open a game, read how it works, then vote to play it this weekend. Up to three. No captain code.</p>
      ${voters}
      <p class="hint" id="vote-hint" role="status">${view.voter ? "" : "Tap your name first."}</p>
      <div class="vote-grid">${voteGrid}</div>
      <h3 id="fav-title">Favourites</h3>
      <div aria-labelledby="fav-title">${pollHtml}</div>
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
    <p class="lede">${esc(game.about || game.blurb)}</p>
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
  if (!drafts.pose[date]) drafts.pose[date] = { ...(state.pose?.[date] || {}) };
  const poseDraft = drafts.pose[date];
  return `
    <section class="quest-feed" aria-labelledby="bounty-title">
      <header class="quest-intro">
        <h2 id="bounty-title">The feed</h2>
        <p class="lede">Each quest is a post. Add a photo or a short video, and a line if you want. Other phones see which teams got it, and the chat. The file stays on the phone that took it. Save it from that phone.</p>
        <div class="field">
          <label for="quest-as">Posting as</label>
          <select id="quest-as" name="poster">
            <option value="">Your name</option>
            ${players().map((player) => `<option value="${player.id}"${player.id === view.poster ? " selected" : ""}>${esc(player.name)} · ${esc(player.teamName)}</option>`).join("")}
          </select>
        </div>
      </header>
      ${bounties.map((bounty) => questPost(bounty)).join("")}
    </section>
    <details class="panel pose-fold">
      <summary>Today's pose · ${esc(pose.name)}</summary>
      <form id="pose-form" aria-labelledby="pose-title">
        <h2 id="pose-title">${esc(pose.name)}</h2>
        <p class="hint">Seated swap: ${esc(pose.seated)}. One spice for every 10 clean seconds, up to 3. Captain saves it.</p>
        <div class="team-grid">
          ${teams.map((team) => `<div class="field"><label for="pose-${team.id}">${esc(team.name)}, seconds</label><input id="pose-${team.id}" name="${team.id}" inputmode="numeric" data-pose="${team.id}" value="${esc(poseDraft[team.id] ?? "")}"></div>`).join("")}
        </div>
        <p id="pose-preview" aria-live="polite">${esc(posePreview(poseDraft))}</p>
        <button class="gold" type="submit">Save pose</button>
      </form>
    </details>`;
}

function posePreview(draft) {
  return teams.map((team) => {
    const spice = Math.min(3, Math.floor(Number(draft[team.id]) / 10) || 0);
    return `${team.name} ${spice} spice`;
  }).join(" · ");
}

function teamGot(cell) {
  return !!(cell?.posted || cell?.confirmed || cell?.photo || cell?.video);
}

function questPost(bounty) {
  const row = state.bounties?.[bounty.id] || {};
  const notes = state.questNotes?.[bounty.id] || [];
  const chips = teams.map((team) => {
    const cell = row[team.id];
    const got = teamGot(cell);
    const spice = cell?.confirmed ? " · spice" : "";
    return `<li class="${got ? "is-in" : ""}" style="--c:${team.colour};--ink:${team.ink}">${esc(team.name)}${spice}</li>`;
  }).join("");
  const shots = teams.map((team) => {
    const cell = row[team.id];
    if (!cell?.photo && !cell?.video) return "";
    const fileName = `${team.name} ${bounty.name}`;
    const caption = cell.caption ? `<span>${esc(cell.caption)}</span>` : "";
    const media = cell.photo
      ? `<img src="${cell.photo}" alt="${esc(`${team.name}, ${bounty.name}`)}" width="720" height="540">`
      : `<p class="hint" data-video-wait>Opening the video…</p><video data-video="${esc(bounty.id)}:${esc(team.id)}" data-name="${esc(fileName)}.mp4" controls playsinline preload="metadata" hidden></video>`;
    const save = cell.photo
      ? `<a class="award-dl" href="${cell.photo}" download="${esc(fileName)}.jpg">Save the photo</a>`
      : `<a class="award-dl" data-save hidden>Save the video</a>`;
    return `<figure>${media}<figcaption><b>${esc(team.name)}</b>${caption}</figcaption>${save}</figure>`;
  }).join("");
  const lines = teams.map((team) => {
    const cell = row[team.id];
    if (!cell?.caption || cell.photo || cell.video) return "";
    return `<p class="quest-line"><b>${esc(team.name)}</b> ${esc(cell.caption)}</p>`;
  }).join("");
  const chat = notes.length
    ? `<ol class="quest-chat">${notes.map((note) => {
        const team = teamById(note.teamId);
        return `<li style="--c:${team?.colour || "var(--gold)"}"><b>${esc(note.name)}</b> ${esc(note.text)}</li>`;
      }).join("")}</ol>`
    : `<p class="hint">No lines yet.</p>`;
  return `
    <article class="quest">
      <header>
        <p class="kicker">2 spice · once a team</p>
        <h3 id="quest-${bounty.id}">${esc(bounty.name)}</h3>
      </header>
      <div class="quest-body">
        <p>${esc(bounty.detail)}</p>
        <ul class="captures">${chips}</ul>
        ${shots ? `<div class="quest-shots">${shots}</div>` : ""}
        ${lines}
        ${chat}
      </div>
      <footer>
        <form data-bounty="${bounty.id}" aria-labelledby="quest-${bounty.id}">
          <div class="field"><label for="team-${bounty.id}">Team</label><select id="team-${bounty.id}" name="team">${teamOptions()}</select></div>
          <div class="field"><label for="file-${bounty.id}">Photo or video</label><input id="file-${bounty.id}" name="photo" type="file" accept="image/*,video/*"></div>
          <div class="field"><label for="cap-${bounty.id}">A line about it</label><input id="cap-${bounty.id}" name="caption" maxlength="80" enterkeyhint="done" value="${esc(row[teams[0].id]?.caption || "")}"></div>
          <p class="hint" id="quest-status-${bounty.id}" role="status"></p>
          <div class="actions">
            <button class="gold" type="submit">Add to the feed</button>
            <button class="ghost" type="button" data-spice="${bounty.id}">Count 2 spice</button>
          </div>
        </form>
        <form data-chat="${bounty.id}" aria-labelledby="quest-${bounty.id}">
          <div class="field"><label for="chat-${bounty.id}">Chat</label><input id="chat-${bounty.id}" name="text" maxlength="80" enterkeyhint="send" autocomplete="off"></div>
          <button class="gold" type="submit">Send</button>
        </form>
      </footer>
    </article>`;
}

function setSync(message) {
  const status = document.querySelector("#sync-status");
  if (status) status.textContent = message;
}

function render() {
  const paint = () => {
    for (const url of mediaUrls) URL.revokeObjectURL(url);
    mediaUrls = [];
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
    if (view.page === "quests") hydrateQuestMedia();
    if (document.querySelector("#award-dialog")?.open) fillAwardRecap();
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

function coastWeekday(iso) {
  if (typeof Temporal !== "undefined") return Temporal.PlainDate.from(iso).toLocaleString("en-ZA", { weekday: "short" });
  const [year, month, day] = iso.split("-").map(Number);
  const shift = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adjusted = month < 3 ? year - 1 : year;
  const index = (adjusted + Math.floor(adjusted / 4) - Math.floor(adjusted / 100) + Math.floor(adjusted / 400) + shift[month - 1] + day) % 7;
  return SKY_WEEK[index];
}

function coastTodayIso() {
  if (typeof Temporal !== "undefined") return Temporal.Now.zonedDateTimeISO("Africa/Johannesburg").toPlainDate().toString();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function skyWord(code) {
  if (code === 0 || code === 1) return "Clear";
  if (code === 2) return "Bright";
  if (code === 3) return "Cloud";
  if (code === 45 || code === 48) return "Mist";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Cold";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Storm";
  return "Sky";
}

function loadSky() {
  if (!skyPromise) {
    skyPromise = fetch(SKY_URL, { priority: "low" }).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).catch((error) => {
      skyPromise = null;
      throw error;
    });
  }
  return skyPromise;
}

function drawSky(root, data) {
  const today = coastTodayIso();
  const now = document.createElement("span");
  now.className = "sky-now";
  const temp = Math.round(data.current.temperature_2m);
  const wind = Math.round(data.current.wind_speed_10m);
  now.textContent = `Coast ${temp}° ${skyWord(data.current.weather_code)} · ${wind} km/h`;
  const days = document.createElement("span");
  days.className = "sky-days";
  days.textContent = data.daily.time.map((iso, index) => {
    const label = iso === today ? "Today" : coastWeekday(iso);
    const high = Math.round(data.daily.temperature_2m_max[index]);
    const low = Math.round(data.daily.temperature_2m_min[index]);
    const chance = data.daily.precipitation_probability_max[index];
    const wet = chance >= 40 ? ` ${chance}%` : "";
    const range = iso === today ? `${high}°/${low}°` : `${high}°`;
    return `${label} ${range}${wet}`;
  }).join(" · ");
  const credit = document.createElement("a");
  credit.className = "sky-credit";
  credit.href = "https://open-meteo.com/";
  credit.rel = "noreferrer";
  credit.textContent = "Open-Meteo";
  root.replaceChildren(now, days, credit);
}

async function paintSky() {
  const root = document.querySelector("#sky");
  if (!root) return;
  try {
    const data = await loadSky();
    if (!root.isConnected) return;
    drawSky(root, data);
  } catch {
    const status = root.isConnected ? root.querySelector(".sky-status") : null;
    if (status) status.textContent = "Coast forecast did not load.";
  }
}

function bindHome() {
  document.querySelector("#award-end")?.addEventListener("click", async () => {
    if (!(await ensureCaptain())) return;
    openAwardPick();
  });
  document.querySelector("#award-open")?.addEventListener("click", () => openAwardRecap());
  document.querySelector(".house")?.addEventListener("toggle", (event) => {
    houseOpen = event.currentTarget.open;
  });
  const fine = window.matchMedia("(pointer: fine)").matches;
  const motion = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  paintSky();
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
    setSync("Saved.");
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
  setSync("Updated.");
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
    const localHas = Object.keys(state.games || {}).length || (state.guesses || []).length || Object.keys(state.votes || {}).length || state.award;
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
      setSync("Updated.");
      render();
    } else if (localRev > remoteRev) {
      base = remote;
      setSync("This phone is ahead. A captain save shares it.");
    } else {
      base = sharedBoard(state);
      setSync("");
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
    const textOk = !query || `${game.name} ${game.blurb} ${game.about || ""}`.toLowerCase().includes(query);
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

function openMedia() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ce-quest-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function mediaKey(bountyId, teamId) {
  return `${bountyId}:${teamId}`;
}

function mediaRequest(mode, key, value) {
  return openMedia().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const store = tx.objectStore("files");
    let request = null;
    if (value !== undefined) request = store.put(value, key);
    else if (mode === "readwrite") store.delete(key);
    else request = store.get(key);
    tx.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  }));
}

let mediaUrls = [];

async function hydrateQuestMedia() {
  for (const url of mediaUrls) URL.revokeObjectURL(url);
  mediaUrls = [];
  const nodes = [...document.querySelectorAll("[data-video]")];
  if (!nodes.length) return;
  for (const node of nodes) {
    if (!node.isConnected) return;
    const blob = await mediaRequest("readonly", node.dataset.video);
    if (!blob || !node.isConnected) continue;
    const url = URL.createObjectURL(blob);
    mediaUrls.push(url);
    node.src = url;
    node.hidden = false;
    node.previousElementSibling?.remove();
    const link = node.parentElement?.querySelector("[data-save]");
    if (link) {
      link.href = url;
      link.download = node.dataset.name || "quest.mp4";
      link.hidden = false;
    }
  }
}

async function rememberFile(bountyId, teamId, file, caption) {
  const key = mediaKey(bountyId, teamId);
  state.bounties[bountyId] = state.bounties[bountyId] || {};
  const previous = state.bounties[bountyId][teamId] || {};
  const next = { ...previous, posted: true, confirmed: false };
  if (caption) next.caption = caption;
  if (file.type.startsWith("video/")) {
    if (file.size > 12 * 1024 * 1024) throw new Error("big");
    await mediaRequest("readwrite", key, file);
    delete next.photo;
    next.video = true;
  } else {
    next.photo = await compressPhoto(file);
    delete next.video;
    await mediaRequest("readwrite", key).catch(() => {});
  }
  state.bounties[bountyId][teamId] = next;
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

function currentAward() {
  const team = teamById(state.award?.winner);
  if (!team) return null;
  return { winner: team.id, at: state.award.at || null, team };
}

function awardFile(team, winnerId) {
  const win = team.id === winnerId;
  return {
    href: `assets/awards/${team.id}-${win ? "winner" : "play"}.png`,
    download: win ? `${team.name} Cup Winners 2026.png` : `${team.name} participation 2026.png`,
    label: win ? "Download the trophy" : "Download the badge",
    kind: win ? "Cup Winners 2026" : "Participation"
  };
}

function fillAwardRecap() {
  const award = currentAward();
  const dialog = document.querySelector("#award-dialog");
  if (!award) {
    if (dialog?.open) dialog.close();
    return;
  }
  document.querySelector("#award-dialog-lead").textContent = `${award.team.name} takes the Cup Winners 2026 trophy. Every other team takes a participation badge.`;
  const list = document.querySelector("#award-dialog-list");
  list.replaceChildren();
  const ordered = [award.team, ...teams.filter((team) => team.id !== award.winner)];
  for (const team of ordered) {
    const file = awardFile(team, award.winner);
    const row = document.createElement("div");
    row.className = "award-row";
    const name = document.createElement("p");
    const strong = document.createElement("b");
    strong.textContent = team.name;
    name.append(strong, document.createTextNode(` · ${file.kind}`));
    const link = document.createElement("a");
    link.className = "award-dl";
    link.href = file.href;
    link.download = file.download;
    link.textContent = file.label;
    row.append(name, link);
    list.append(row);
  }
}

function openAwardRecap() {
  const pick = document.querySelector("#award-pick");
  if (pick?.open) pick.close();
  fillAwardRecap();
  const dialog = document.querySelector("#award-dialog");
  if (currentAward() && dialog && !dialog.open) dialog.showModal();
}

function openAwardPick() {
  const box = document.querySelector("#award-picks");
  box.replaceChildren();
  for (const team of teams) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "award-pick";
    button.style.setProperty("--c", team.colour);
    button.style.setProperty("--ink", team.ink);
    button.textContent = team.name;
    button.addEventListener("click", () => {
      document.querySelector("#award-pick")?.close();
      state.award = { winner: team.id, at: new Date().toISOString() };
      saveState(state);
      publish();
      render();
      openAwardRecap();
    });
    box.append(button);
  }
  document.querySelector("#award-pick")?.showModal();
}

function openCrest(teamId) {
  const team = teamById(teamId);
  if (!team) return;
  const cup = cupTotals();
  const spice = spiceTotals();
  const ordered = orderedTeams(cup, spice);
  const bestCup = cup[ordered[0].id];
  const place = bestCup === 0 ? "—" : String(ordered.findIndex((item) => cup[item.id] === cup[team.id] && spice[item.id] === spice[team.id]) + 1);
  crestTitle.textContent = team.name;
  crestPlace.textContent = place;
  crestScore.textContent = `${formatPoints(cup[team.id])} cup · ${formatPoints(spice[team.id])} spice`;
  crestArt.src = team.crest;
  crestArt.alt = `${team.name} medallion`;
  crestRoster.replaceChildren(...team.players.map((player) => {
    const item = document.createElement("li");
    item.textContent = player.name;
    return item;
  }));
  crestDialog.style.setProperty("--c", team.colour);
  crestDialog.style.setProperty("--ink", team.ink);
  crestDialog.showModal();
}

if (!("closedBy" in HTMLDialogElement.prototype)) {
  document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
    let pressedOutside = false;
    const outside = (event) => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener("pointerdown", (event) => {
      pressedOutside = outside(event);
    });
    dialog.addEventListener("pointerup", (event) => {
      if (pressedOutside && outside(event)) dialog.close();
    });
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
  const crest = event.target.closest("[data-crest]");
  if (crest) {
    openCrest(crest.dataset.crest);
    return;
  }
  const read = event.target.closest("[data-read]");
  if (read && view.page === "home") {
    fillVoteDialog(read.dataset.read);
    document.querySelector("#vote-dialog")?.showModal();
    return;
  }
  const voter = event.target.closest("[data-voter]");
  if (voter && view.page === "home") {
    view.voter = voter.dataset.voter;
    render();
    document.querySelector(`[data-voter="${CSS.escape(view.voter)}"]`)?.focus();
    if (document.querySelector("#vote-dialog")?.open && view.reading) fillVoteDialog(view.reading);
  }
});

document.querySelector("#vote-toggle")?.addEventListener("click", () => {
  if (view.reading) castVote(view.reading);
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
    const data = new FormData(form);
    const teamId = String(data.get("team") || "");
    const caption = String(data.get("caption") || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const status = form.querySelector("[role=status]");
    state.bounties[bountyId] = state.bounties[bountyId] || {};
    const cell = state.bounties[bountyId][teamId] || {};
    if (!cell.photo && !cell.video && !caption) {
      if (status) status.textContent = "Add a photo, a video, or a line.";
      return;
    }
    state.bounties[bountyId][teamId] = { ...cell, posted: true, ...(caption ? { caption } : {}) };
    saveState(state);
    publish();
    render();
    return;
  }
  const chatId = form.dataset.chat;
  if (chatId) {
    event.preventDefault();
    const text = String(new FormData(form).get("text") || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const player = players().find((item) => item.id === view.poster);
    const status = form.querySelector("[role=status]");
    if (!player) {
      const note = form.querySelector("[role=status]") || form.insertAdjacentElement("beforeend", Object.assign(document.createElement("p"), { className: "hint", role: "status" }));
      note.textContent = "Choose your name at the top.";
      return;
    }
    if (!text) return;
    state.questNotes = state.questNotes || {};
    const list = state.questNotes[chatId] || [];
    list.push({ id: `${Date.now()}-${player.id}`, name: player.name, teamId: player.teamId, text, at: Date.now() });
    state.questNotes[chatId] = list.slice(-12);
    saveState(state);
    publish();
    render();
    if (status) status.textContent = "";
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
  if (event.target.id === "quest-as") {
    view.poster = event.target.value;
    return;
  }
  if (event.target.name === "team" && event.target.form?.dataset.bounty) {
    const cell = state.bounties?.[event.target.form.dataset.bounty]?.[event.target.value];
    const input = event.target.form.querySelector("[name=caption]");
    if (input) input.value = cell?.caption || "";
    return;
  }
  if (event.target.type === "file" && event.target.form?.dataset.bounty) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = event.target.form;
    const bountyId = form.dataset.bounty;
    const teamId = new FormData(form).get("team");
    const caption = String(new FormData(form).get("caption") || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const status = form.querySelector("[role=status]");
    try {
      await rememberFile(bountyId, teamId, file, caption);
      publish();
      render();
    } catch (error) {
      if (status) status.textContent = error?.message === "big"
        ? "That video is too long for this phone. Try a shorter one."
        : "That file could not be stored on this phone.";
    }
  }
});

viewRoot.addEventListener("click", async (event) => {
  const spice = event.target.closest("[data-spice]");
  if (spice) {
    if (!(await ensureCaptain())) return;
    const form = spice.form;
    const bountyId = spice.dataset.spice;
    const teamId = String(new FormData(form).get("team") || "");
    const status = form.querySelector("[role=status]");
    const cell = state.bounties?.[bountyId]?.[teamId];
    if (!cell?.photo && !cell?.video && !cell?.posted) {
      if (status) status.textContent = "Add a photo or a video first.";
      return;
    }
    state.bounties[bountyId][teamId] = { ...cell, posted: true, confirmed: true };
    saveState(state);
    publish();
    render();
    return;
  }
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
