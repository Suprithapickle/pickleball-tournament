/* Pickleball Tournament — single-page app.
 * All state is persisted to localStorage under STORAGE_KEY.
 */

(function () {
  "use strict";

  const STORAGE_KEY = "pickleball-tournament-v1";
  const POINTS_PER_ROUND_WIN = 2;
  const ROUNDS_PER_MATCH = 3;         // upper bound: best-of-3
  const ROUND_WINS_TO_WIN_MATCH = 2;   // best-of-3 → first to 2 round wins
  const REMOTE_RESULTS_URL = "results.json";

  // -------------------- State --------------------

  /**
   * State shape:
   * {
   *   players: string[],
   *   results: { [matchId]: { rounds: [{p1:number,p2:number}, ...] } }
   * }
   */
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          players: Array.isArray(parsed.players) ? parsed.players : PLAYERS.slice(),
          results: parsed.results && typeof parsed.results === "object" ? parsed.results : {}
        };
      }
    } catch (e) {
      console.warn("Failed to load state, starting fresh.", e);
    }
    return { players: PLAYERS.slice(), results: {} };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      alert("Could not save to localStorage: " + e.message);
    }
  }

  // -------------------- Scoring helpers --------------------

  function matchResult(matchId) {
    return state.results[matchId] || null;
  }

  /** returns { played, p1Points, p2Points, p1RoundWins, p2RoundWins, winner, complete } */
  function matchSummary(match) {
    const r = matchResult(match.id);
    if (!r || !Array.isArray(r.rounds)) {
      return {
        played: false, complete: false,
        p1Points: 0, p2Points: 0,
        p1RoundWins: 0, p2RoundWins: 0,
        winner: null
      };
    }
    let p1RW = 0, p2RW = 0, filledRounds = 0;
    for (const round of r.rounds) {
      const s1 = Number(round?.p1);
      const s2 = Number(round?.p2);
      if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue;
      filledRounds++;
      if (s1 > s2) p1RW++;
      else if (s2 > s1) p2RW++;
    }
    // Best-of-3: match is complete when either side reaches 2 round wins,
    // or when all 3 rounds have been played (covers ties / draws).
    const decided = p1RW >= ROUND_WINS_TO_WIN_MATCH || p2RW >= ROUND_WINS_TO_WIN_MATCH;
    const complete = decided || filledRounds === ROUNDS_PER_MATCH;
    const p1Points = p1RW * POINTS_PER_ROUND_WIN;
    const p2Points = p2RW * POINTS_PER_ROUND_WIN;
    let winner = null;
    if (complete) {
      if (p1RW > p2RW) winner = match.p1;
      else if (p2RW > p1RW) winner = match.p2;
      else winner = "Tie";
    }
    return {
      played: filledRounds > 0,
      complete,
      p1Points, p2Points,
      p1RoundWins: p1RW, p2RoundWins: p2RW,
      winner
    };
  }

  function computeLeaderboard() {
    const stats = {};
    for (const p of state.players) {
      stats[p] = {
        player: p, played: 0, wins: 0, losses: 0,
        ties: 0, roundWins: 0, points: 0
      };
    }
    for (const match of SCHEDULE) {
      const s = matchSummary(match);
      if (!s.complete) continue;
      const p1 = stats[match.p1];
      const p2 = stats[match.p2];
      if (p1) {
        p1.played++;
        p1.roundWins += s.p1RoundWins;
        p1.points += s.p1Points;
      }
      if (p2) {
        p2.played++;
        p2.roundWins += s.p2RoundWins;
        p2.points += s.p2Points;
      }
      if (s.winner === "Tie") {
        if (p1) p1.ties++;
        if (p2) p2.ties++;
      } else if (s.winner === match.p1) {
        if (p1) p1.wins++;
        if (p2) p2.losses++;
      } else if (s.winner === match.p2) {
        if (p2) p2.wins++;
        if (p1) p1.losses++;
      }
    }
    const list = Object.values(stats);
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return a.player.localeCompare(b.player);
    });
    return list;
  }

  function tournamentStats() {
    const total = SCHEDULE.length;
    let played = 0;
    for (const m of SCHEDULE) if (matchSummary(m).complete) played++;
    const remaining = total - played;
    const pct = total ? Math.round((played / total) * 100) : 0;
    return {
      totalPlayers: state.players.length,
      totalMatches: total,
      matchesPlayed: played,
      matchesRemaining: remaining,
      completionPct: pct,
      duration: TOURNAMENT_META.duration
    };
  }

  // -------------------- Rendering --------------------

  function fmtDate(iso) {
    // iso: YYYY-MM-DD
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  }

  function renderHero() {
    document.getElementById("title").textContent = TOURNAMENT_META.title;
  }

  function renderStats() {
    const s = tournamentStats();
    const grid = document.getElementById("stats-grid");
    grid.innerHTML = "";
    const cards = [
      { label: "Total Players", value: s.totalPlayers, cls: "accent" },
      { label: "Total Matches", value: s.totalMatches, cls: "" },
      { label: "Matches Played", value: s.matchesPlayed, cls: "good" },
      { label: "Matches Remaining", value: s.matchesRemaining, cls: "warn" },
      { label: "Completion", value: s.completionPct + "%", cls: "accent" },
      { label: "Duration", value: s.duration, cls: "" }
    ];
    for (const c of cards) {
      const el = document.createElement("div");
      el.className = "stat-card " + c.cls;
      el.innerHTML =
        `<div class="stat-label">${c.label}</div>` +
        `<div class="stat-value">${c.value}</div>`;
      grid.appendChild(el);
    }
  }

  function renderLeaderboard() {
    const rows = computeLeaderboard();
    const tbody = document.querySelector("#leaderboard tbody");
    tbody.innerHTML = "";
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.className = "rank-" + (i + 1);
      const medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "";
      tr.innerHTML =
        `<td class="rank">${medal}${i + 1}</td>` +
        `<td>${escapeHtml(r.player)}</td>` +
        `<td>${r.played}</td>` +
        `<td>${r.wins}</td>` +
        `<td>${r.losses}</td>` +
        `<td>${r.roundWins}</td>` +
        `<td class="points">${r.points}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderNextUp() {
    const container = document.getElementById("next-up");
    container.innerHTML = "";
    const pending = SCHEDULE.filter((m) => !matchSummary(m).complete).slice(0, 6);
    if (!pending.length) {
      container.innerHTML = '<p class="hint">🎉 All matches complete!</p>';
      return;
    }
    for (const m of pending) {
      const card = document.createElement("div");
      card.className = "match-card";
      card.innerHTML =
        `<div class="date">Match #${m.id} · ${fmtDate(m.date)}</div>` +
        `<div class="matchup">${escapeHtml(m.p1)} 🆚 ${escapeHtml(m.p2)}</div>`;
      card.addEventListener("click", () => openMatchModal(m.id));
      container.appendChild(card);
    }
  }

  function renderSchedule() {
    const container = document.getElementById("schedule-list");
    const filterPlayer = document.getElementById("filter-player").value;
    const filterStatus = document.getElementById("filter-status").value;

    // group by date
    const byDate = new Map();
    for (const m of SCHEDULE) {
      if (filterPlayer && m.p1 !== filterPlayer && m.p2 !== filterPlayer) continue;
      const s = matchSummary(m);
      if (filterStatus === "pending" && s.complete) continue;
      if (filterStatus === "completed" && !s.complete) continue;
      if (!byDate.has(m.date)) byDate.set(m.date, []);
      byDate.get(m.date).push(m);
    }

    container.innerHTML = "";
    if (!byDate.size) {
      container.innerHTML = '<p class="hint">No matches match the current filter.</p>';
      return;
    }

    for (const [date, matches] of byDate) {
      const complete = matches.filter((m) => matchSummary(m).complete).length;
      const wrap = document.createElement("div");
      wrap.className = "day-group";
      wrap.innerHTML =
        `<h3>📅 ${fmtDate(date)} <span class="progress">${complete}/${matches.length} played</span></h3>`;
      const table = document.createElement("table");
      table.className = "matches";
      table.innerHTML =
        `<thead><tr>
           <th>#</th>
           <th>Player 1</th>
           <th>R1</th><th>R2</th><th>R3</th>
           <th>Player 2</th>
           <th>P1 Pts</th><th>P2 Pts</th>
           <th>Winner</th>
           <th></th>
         </tr></thead><tbody></tbody>`;
      const tbody = table.querySelector("tbody");
      for (const m of matches) {
        const s = matchSummary(m);
        const r = matchResult(m.id);
        const tr = document.createElement("tr");
        if (s.complete) tr.className = "completed";
        const roundCell = (idx) => {
          if (!r || !r.rounds || !r.rounds[idx]) return `<td class="rounds">—</td>`;
          const rn = r.rounds[idx];
          const s1 = Number.isFinite(Number(rn.p1)) ? rn.p1 : "";
          const s2 = Number.isFinite(Number(rn.p2)) ? rn.p2 : "";
          if (s1 === "" && s2 === "") return `<td class="rounds">—</td>`;
          return `<td class="rounds">${s1}-${s2}</td>`;
        };
        const winnerLabel = s.complete
          ? (s.winner === "Tie" ? "Tie" : escapeHtml(s.winner))
          : "—";
        const btn = s.complete
          ? `<button class="enter-score done" data-match="${m.id}">Edit</button>`
          : `<button class="enter-score" data-match="${m.id}">Enter</button>`;

        const p1WinClass = s.complete && s.winner === m.p1 ? " winner-p1" : "";
        const p2WinClass = s.complete && s.winner === m.p2 ? " winner-p2" : "";

        tr.innerHTML =
          `<td>${m.id}</td>` +
          `<td class="${p1WinClass}">${escapeHtml(m.p1)}</td>` +
          roundCell(0) + roundCell(1) + roundCell(2) +
          `<td class="${p2WinClass}">${escapeHtml(m.p2)}</td>` +
          `<td class="pts">${s.p1Points}</td>` +
          `<td class="pts">${s.p2Points}</td>` +
          `<td class="winner">${winnerLabel}</td>` +
          `<td>${btn}</td>`;
        tbody.appendChild(tr);
      }
      wrap.appendChild(table);
      container.appendChild(wrap);
    }

    // Bind buttons
    container.querySelectorAll("button.enter-score").forEach((btn) => {
      btn.addEventListener("click", () => {
        openMatchModal(Number(btn.dataset.match));
      });
    });
  }

  function renderPlayerFilter() {
    const sel = document.getElementById("filter-player");
    const current = sel.value;
    sel.innerHTML = '<option value="">— All —</option>';
    for (const p of state.players) {
      const o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      sel.appendChild(o);
    }
    if (state.players.includes(current)) sel.value = current;
  }

  function renderPlayers() {
    const ul = document.getElementById("player-list");
    ul.innerHTML = "";
    for (const p of state.players) {
      const li = document.createElement("li");
      const inSchedule = SCHEDULE.some((m) => m.p1 === p || m.p2 === p);
      if (inSchedule) li.classList.add("locked");
      li.innerHTML = `<span>${escapeHtml(p)}</span>` +
        `<button class="remove" title="${inSchedule ? "Locked (used in schedule)" : "Remove"}">✕</button>`;
      li.querySelector("button.remove").addEventListener("click", () => {
        if (inSchedule) {
          alert("Cannot remove — this player is in the schedule.");
          return;
        }
        state.players = state.players.filter((n) => n !== p);
        saveState();
        renderAll();
      });
      ul.appendChild(li);
    }
  }

  function renderDataPreview() {
    const pre = document.getElementById("results-preview");
    pre.textContent = JSON.stringify(state, null, 2);
  }

  function renderAll() {
    renderHero();
    renderStats();
    renderLeaderboard();
    renderNextUp();
    renderPlayerFilter();
    renderSchedule();
    renderPlayers();
    renderDataPreview();
  }

  // -------------------- Modal --------------------

  let currentMatchId = null;

  function openMatchModal(matchId) {
    const match = SCHEDULE.find((m) => m.id === matchId);
    if (!match) return;
    currentMatchId = matchId;
    document.getElementById("modal-title").textContent =
      `Match #${match.id} — ${fmtDate(match.date)}`;
    document.getElementById("modal-sub").textContent =
      `Best of 3 rounds. Round winner earns ${POINTS_PER_ROUND_WIN} points. R3 only if needed.`;
    document.getElementById("modal-p1").textContent = match.p1;
    document.getElementById("modal-p2").textContent = match.p2;

    const rows = document.getElementById("round-rows");
    rows.innerHTML = "";
    const existing = matchResult(matchId);
    for (let i = 0; i < ROUNDS_PER_MATCH; i++) {
      const r = existing && existing.rounds && existing.rounds[i] ? existing.rounds[i] : { p1: "", p2: "" };
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td class="round-label">R${i + 1}</td>` +
        `<td><input type="number" min="0" step="1" data-round="${i}" data-side="p1" value="${r.p1 === 0 || r.p1 ? r.p1 : ""}"></td>` +
        `<td>—</td>` +
        `<td><input type="number" min="0" step="1" data-round="${i}" data-side="p2" value="${r.p2 === 0 || r.p2 ? r.p2 : ""}"></td>`;
      rows.appendChild(tr);
    }
    rows.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("input", updateModalSummary)
    );
    updateModalSummary();

    document.getElementById("score-modal").hidden = false;
  }

  function collectRoundsFromModal() {
    const rounds = [];
    for (let i = 0; i < ROUNDS_PER_MATCH; i++) {
      const p1El = document.querySelector(`#round-rows input[data-round="${i}"][data-side="p1"]`);
      const p2El = document.querySelector(`#round-rows input[data-round="${i}"][data-side="p2"]`);
      const p1 = p1El.value === "" ? null : Number(p1El.value);
      const p2 = p2El.value === "" ? null : Number(p2El.value);
      rounds.push({ p1, p2 });
    }
    return rounds;
  }

  function updateModalSummary() {
    const match = SCHEDULE.find((m) => m.id === currentMatchId);
    if (!match) return;
    // Compute preview
    const rounds = collectRoundsFromModal();
    let p1RW = 0, p2RW = 0, filled = 0;
    for (const r of rounds) {
      if (r.p1 == null || r.p2 == null || !Number.isFinite(r.p1) || !Number.isFinite(r.p2)) continue;
      filled++;
      if (r.p1 > r.p2) p1RW++;
      else if (r.p2 > r.p1) p2RW++;
    }
    const p1Pts = p1RW * POINTS_PER_ROUND_WIN;
    const p2Pts = p2RW * POINTS_PER_ROUND_WIN;
    let msg = `Rounds filled: <strong>${filled}/${ROUNDS_PER_MATCH}</strong> · ` +
              `Points — ${escapeHtml(match.p1)}: <strong>${p1Pts}</strong> · ` +
              `${escapeHtml(match.p2)}: <strong>${p2Pts}</strong>`;
    if (filled === ROUNDS_PER_MATCH || p1RW >= ROUND_WINS_TO_WIN_MATCH || p2RW >= ROUND_WINS_TO_WIN_MATCH) {
      let winner = "Tie";
      if (p1RW > p2RW) winner = match.p1;
      else if (p2RW > p1RW) winner = match.p2;
      msg += `<br>🏆 Winner: <strong>${escapeHtml(winner)}</strong>`;
    } else {
      msg += `<br>Best of 3 — first to ${ROUND_WINS_TO_WIN_MATCH} round wins takes the match.`;
    }
    document.getElementById("modal-summary").innerHTML = msg;
  }

  function closeModal() {
    document.getElementById("score-modal").hidden = true;
    currentMatchId = null;
  }

  function saveModal() {
    if (currentMatchId == null) return;
    const rounds = collectRoundsFromModal();
    // Basic validation: scores must be non-negative integers if provided
    for (const r of rounds) {
      for (const side of ["p1", "p2"]) {
        const v = r[side];
        if (v == null) continue;
        if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
          alert("Scores must be non-negative whole numbers.");
          return;
        }
      }
      // Both sides must be provided together for a round to count
      if ((r.p1 == null) !== (r.p2 == null)) {
        alert("Please provide scores for both players in each round you fill.");
        return;
      }
    }
    state.results[currentMatchId] = { rounds };
    saveState();
    closeModal();
    renderAll();
  }

  function clearMatch() {
    if (currentMatchId == null) return;
    if (!confirm("Clear scores for this match?")) return;
    delete state.results[currentMatchId];
    saveState();
    closeModal();
    renderAll();
  }

  // -------------------- Tabs --------------------

  function initTabs() {
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      });
    });
  }

  // -------------------- Import / Export --------------------

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pickleball-tournament-results.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object") throw new Error("Not an object");
        const players = Array.isArray(parsed.players) ? parsed.players : state.players;
        const results = parsed.results && typeof parsed.results === "object" ? parsed.results : {};
        if (!confirm("Replace current data with imported file?")) return;
        state = { players, results };
        saveState();
        renderAll();
        alert("Import successful.");
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function resetScores() {
    if (!confirm("Delete ALL match scores? Player list is kept.")) return;
    state.results = {};
    saveState();
    renderAll();
  }

  // -------------------- Remote sync (results.json in the repo) --------------------

  const REMOTE_APPLIED_KEY = "pickleball-remote-applied-v1";

  async function fetchRemoteResults() {
    try {
      const url = REMOTE_RESULTS_URL + "?t=" + Date.now(); // cache-bust
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) return null;
      const parsed = await resp.json();
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      console.info("No remote results available:", e);
      return null;
    }
  }

  function fingerprint(obj) {
    return JSON.stringify(obj);
  }

  function applyRemote(remote, { silent } = { silent: false }) {
    const players = Array.isArray(remote.players) && remote.players.length
      ? remote.players
      : state.players;
    const results = remote.results && typeof remote.results === "object"
      ? remote.results
      : {};
    state = { players, results };
    saveState();
    localStorage.setItem(REMOTE_APPLIED_KEY, fingerprint(remote));
    renderAll();
    if (!silent) showBanner("📥 Loaded latest scores from repo.");
  }

  async function autoSyncOnLoad() {
    const remote = await fetchRemoteResults();
    if (!remote) return;
    const localEmpty = !state.results || Object.keys(state.results).length === 0;
    const lastApplied = localStorage.getItem(REMOTE_APPLIED_KEY);
    const remoteFp = fingerprint(remote);
    if (localEmpty) {
      applyRemote(remote, { silent: false });
      return;
    }
    if (lastApplied !== remoteFp) {
      // Newer version available in the repo — offer to load it.
      showBanner(
        "📥 Newer scores available in the repo. " +
        '<button id="sync-now-btn">Load them</button>' +
        ' <button id="sync-ignore-btn" class="ghost">Keep mine</button>'
      );
      const loadBtn = document.getElementById("sync-now-btn");
      const ignoreBtn = document.getElementById("sync-ignore-btn");
      if (loadBtn) loadBtn.addEventListener("click", () => applyRemote(remote));
      if (ignoreBtn) ignoreBtn.addEventListener("click", () => {
        localStorage.setItem(REMOTE_APPLIED_KEY, remoteFp);
        hideBanner();
      });
    }
  }

  async function manualSyncFromRepo() {
    const remote = await fetchRemoteResults();
    if (!remote) {
      alert("Could not fetch results.json from the repo.");
      return;
    }
    if (!confirm("Replace your local data with the latest results.json from the repo?")) return;
    applyRemote(remote, { silent: true });
    alert("Loaded latest scores from repo.");
  }

  function showBanner(html) {
    let el = document.getElementById("sync-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "sync-banner";
      el.className = "sync-banner";
      document.body.appendChild(el);
    }
    el.innerHTML = html + ' <button class="banner-close" title="Dismiss">×</button>';
    el.querySelector(".banner-close").addEventListener("click", hideBanner);
    el.hidden = false;
    setTimeout(() => { if (el && !el.querySelector("button:not(.banner-close)")) hideBanner(); }, 4000);
  }

  function hideBanner() {
    const el = document.getElementById("sync-banner");
    if (el) el.hidden = true;
  }

  // -------------------- Utilities --------------------

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------------------- Wire up --------------------

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    renderAll();

    document.getElementById("filter-player").addEventListener("change", renderSchedule);
    document.getElementById("filter-status").addEventListener("change", renderSchedule);

    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("save-match").addEventListener("click", saveModal);
    document.getElementById("clear-match").addEventListener("click", clearMatch);
    document.getElementById("score-modal").addEventListener("click", (e) => {
      if (e.target.id === "score-modal") closeModal();
    });

    document.getElementById("add-player-btn").addEventListener("click", () => {
      const input = document.getElementById("new-player-name");
      const name = input.value.trim();
      if (!name) return;
      if (state.players.includes(name)) {
        alert("Player already exists.");
        return;
      }
      state.players.push(name);
      saveState();
      input.value = "";
      renderAll();
    });

    document.getElementById("export-btn").addEventListener("click", exportJSON);
    document.getElementById("import-btn").addEventListener("click", () =>
      document.getElementById("import-file").click()
    );
    document.getElementById("import-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSONFile(f);
      e.target.value = "";
    });
    document.getElementById("reset-btn").addEventListener("click", resetScores);
    const syncBtn = document.getElementById("sync-btn");
    if (syncBtn) syncBtn.addEventListener("click", manualSyncFromRepo);

    autoSyncOnLoad();
  });
})();
