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
   *   teams: { name: string, players: string[] }[],
   *   results: { [matchId]: { rounds: [{p1:number,p2:number}, ...] } },
   *   doublesResults: { [matchId]: { rounds: [{p1:number,p2:number}, ...] } }
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
          teams: Array.isArray(parsed.teams) && parsed.teams.length ? parsed.teams : TEAMS.slice(),
          results: parsed.results && typeof parsed.results === "object" ? parsed.results : {},
          doublesResults: parsed.doublesResults && typeof parsed.doublesResults === "object" ? parsed.doublesResults : {}
        };
      }
    } catch (e) {
      console.warn("Failed to load state, starting fresh.", e);
    }
    return { players: PLAYERS.slice(), teams: TEAMS.slice(), results: {}, doublesResults: {} };
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

  function doublesMatchResult(matchId) {
    return state.doublesResults[matchId] || null;
  }

  /** Generic best-of-3 summary from a stored result. */
  function summarizeRounds(r, p1Label, p2Label) {
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
    const decided = p1RW >= ROUND_WINS_TO_WIN_MATCH || p2RW >= ROUND_WINS_TO_WIN_MATCH;
    const complete = decided || filledRounds === ROUNDS_PER_MATCH;
    const p1Points = p1RW * POINTS_PER_ROUND_WIN;
    const p2Points = p2RW * POINTS_PER_ROUND_WIN;
    let winner = null;
    if (complete) {
      if (p1RW > p2RW) winner = p1Label;
      else if (p2RW > p1RW) winner = p2Label;
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

  /** returns { played, p1Points, p2Points, p1RoundWins, p2RoundWins, winner, complete } */
  function matchSummary(match) {
    return summarizeRounds(matchResult(match.id), match.p1, match.p2);
  }

  function doublesMatchSummary(match) {
    return summarizeRounds(doublesMatchResult(match.id), match.t1, match.t2);
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

  function computeDoublesLeaderboard() {
    const stats = {};
    for (const t of state.teams) {
      stats[t.name] = {
        team: t.name, players: t.players || [],
        played: 0, wins: 0, losses: 0,
        ties: 0, roundWins: 0, points: 0
      };
    }
    for (const match of DOUBLES_SCHEDULE) {
      const s = doublesMatchSummary(match);
      if (!s.complete) continue;
      const t1 = stats[match.t1];
      const t2 = stats[match.t2];
      if (t1) {
        t1.played++;
        t1.roundWins += s.p1RoundWins;
        t1.points += s.p1Points;
      }
      if (t2) {
        t2.played++;
        t2.roundWins += s.p2RoundWins;
        t2.points += s.p2Points;
      }
      if (s.winner === "Tie") {
        if (t1) t1.ties++;
        if (t2) t2.ties++;
      } else if (s.winner === match.t1) {
        if (t1) t1.wins++;
        if (t2) t2.losses++;
      } else if (s.winner === match.t2) {
        if (t2) t2.wins++;
        if (t1) t1.losses++;
      }
    }
    const list = Object.values(stats);
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
      return a.team.localeCompare(b.team);
    });
    return list;
  }

  function tournamentStats() {
    const total = SCHEDULE.length;
    let played = 0;
    for (const m of SCHEDULE) if (matchSummary(m).complete) played++;
    const remaining = total - played;
    const pct = total ? Math.round((played / total) * 100) : 0;

    const doublesTotal = DOUBLES_SCHEDULE.length;
    let doublesPlayed = 0;
    for (const m of DOUBLES_SCHEDULE) if (doublesMatchSummary(m).complete) doublesPlayed++;
    const doublesRemaining = doublesTotal - doublesPlayed;
    const doublesPct = doublesTotal ? Math.round((doublesPlayed / doublesTotal) * 100) : 0;

    return {
      totalPlayers: state.players.length,
      totalTeams: state.teams.length,
      totalMatches: total,
      matchesPlayed: played,
      matchesRemaining: remaining,
      completionPct: pct,
      doublesTotalMatches: doublesTotal,
      doublesMatchesPlayed: doublesPlayed,
      doublesMatchesRemaining: doublesRemaining,
      doublesCompletionPct: doublesPct,
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
      { label: "Total Teams", value: s.totalTeams, cls: "accent" },
      { label: "Doubles Matches", value: s.doublesTotalMatches, cls: "" },
      { label: "Doubles Played", value: s.doublesMatchesPlayed, cls: "good" },
      { label: "Doubles Remaining", value: s.doublesMatchesRemaining, cls: "warn" },
      { label: "Doubles Completion", value: s.doublesCompletionPct + "%", cls: "accent" },
      { label: "Round", value: s.duration, cls: "" }
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
        `<td class="points">${r.points}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderDoublesLeaderboard() {
    const rows = computeDoublesLeaderboard();
    const tbody = document.querySelector("#leaderboard-doubles tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.className = "rank-" + (i + 1);
      const medal = i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : "";
      const playersLabel = r.players && r.players.length
        ? `<div class="team-players">${escapeHtml(r.players.join(" & "))}</div>`
        : "";
      tr.innerHTML =
        `<td class="rank">${medal}${i + 1}</td>` +
        `<td><div class="team-name">${escapeHtml(r.team)}</div>${playersLabel}</td>` +
        `<td>${r.played}</td>` +
        `<td>${r.wins}</td>` +
        `<td>${r.losses}</td>` +
        `<td class="points">${r.points}</td>`;
      tbody.appendChild(tr);
    });
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
         </tr></thead><tbody></tbody>`;
      const tbody = table.querySelector("tbody");
      for (const m of matches) {
        const s = matchSummary(m);
        const r = matchResult(m.id);
        const tr = document.createElement("tr");
        if (s.complete) tr.className = "completed";
        const roundCell = (idx) => {
          const hasResult = !!(r && r.rounds);
          if (!hasResult || !r.rounds[idx]) return `<td class="rounds">—</td>`;
          const rn = r.rounds[idx];
          const s1 = Number.isFinite(Number(rn.p1)) ? rn.p1 : null;
          const s2 = Number.isFinite(Number(rn.p2)) ? rn.p2 : null;
          if (s1 === null && s2 === null) return `<td class="rounds">—</td>`;
          return `<td class="rounds">${s1 ?? 0}-${s2 ?? 0}</td>`;
        };

        const p1WinClass = s.complete && s.winner === m.p1 ? " winner-p1" : "";
        const p2WinClass = s.complete && s.winner === m.p2 ? " winner-p2" : "";

        tr.innerHTML =
          `<td>${m.id}</td>` +
          `<td class="${p1WinClass}">${escapeHtml(m.p1)}</td>` +
          roundCell(0) + roundCell(1) + roundCell(2) +
          `<td class="${p2WinClass}">${escapeHtml(m.p2)}</td>` +
          `<td class="pts">${s.p1Points}</td>` +
          `<td class="pts">${s.p2Points}</td>`;
        tbody.appendChild(tr);
      }
      wrap.appendChild(table);
      container.appendChild(wrap);
    }
  }

  function renderDoublesSchedule() {
    const container = document.getElementById("doubles-schedule-list");
    if (!container) return;
    const filterTeam = document.getElementById("filter-team").value;
    const filterStatus = document.getElementById("filter-doubles-status").value;

    const byRound = new Map();
    for (const m of DOUBLES_SCHEDULE) {
      if (filterTeam && m.t1 !== filterTeam && m.t2 !== filterTeam) continue;
      const s = doublesMatchSummary(m);
      if (filterStatus === "pending" && s.complete) continue;
      if (filterStatus === "completed" && !s.complete) continue;
      if (!byRound.has(m.round)) byRound.set(m.round, []);
      byRound.get(m.round).push(m);
    }

    container.innerHTML = "";
    if (!byRound.size) {
      container.innerHTML = '<p class="hint">No matches match the current filter.</p>';
      return;
    }

    for (const [round, matches] of byRound) {
      const complete = matches.filter((m) => doublesMatchSummary(m).complete).length;
      const wrap = document.createElement("div");
      wrap.className = "day-group";
      wrap.innerHTML =
        `<h3>🤝 Round ${round} <span class="progress">${complete}/${matches.length} played</span></h3>`;
      const table = document.createElement("table");
      table.className = "matches";
      table.innerHTML =
        `<thead><tr>
           <th>#</th>
           <th>Team 1</th>
           <th>R1</th><th>R2</th><th>R3</th>
           <th>Team 2</th>
           <th>T1 Pts</th><th>T2 Pts</th>
         </tr></thead><tbody></tbody>`;
      const tbody = table.querySelector("tbody");
      for (const m of matches) {
        const s = doublesMatchSummary(m);
        const r = doublesMatchResult(m.id);
        const tr = document.createElement("tr");
        if (s.complete) tr.className = "completed";
        const roundCell = (idx) => {
          const hasResult = !!(r && r.rounds);
          if (!hasResult || !r.rounds[idx]) return `<td class="rounds">—</td>`;
          const rn = r.rounds[idx];
          const s1 = Number.isFinite(Number(rn.p1)) ? rn.p1 : null;
          const s2 = Number.isFinite(Number(rn.p2)) ? rn.p2 : null;
          if (s1 === null && s2 === null) return `<td class="rounds">—</td>`;
          return `<td class="rounds">${s1 ?? 0}-${s2 ?? 0}</td>`;
        };

        const t1WinClass = s.complete && s.winner === m.t1 ? " winner-p1" : "";
        const t2WinClass = s.complete && s.winner === m.t2 ? " winner-p2" : "";

        tr.innerHTML =
          `<td>${m.id}</td>` +
          `<td class="${t1WinClass}">${escapeHtml(m.t1)}</td>` +
          roundCell(0) + roundCell(1) + roundCell(2) +
          `<td class="${t2WinClass}">${escapeHtml(m.t2)}</td>` +
          `<td class="pts">${s.p1Points}</td>` +
          `<td class="pts">${s.p2Points}</td>`;
        tr.addEventListener("click", () => openMatchModal(m.id, "doubles"));
        tbody.appendChild(tr);
      }
      wrap.appendChild(table);
      container.appendChild(wrap);
    }
  }

  function renderTeamFilter() {
    const sel = document.getElementById("filter-team");
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— All —</option>';
    for (const t of state.teams) {
      const o = document.createElement("option");
      o.value = t.name;
      o.textContent = t.name;
      sel.appendChild(o);
    }
    if (state.teams.some((t) => t.name === current)) sel.value = current;
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

  function renderTeams() {
    const ul = document.getElementById("team-list");
    if (!ul) return;
    ul.innerHTML = "";
    for (const t of state.teams) {
      const li = document.createElement("li");
      const players = Array.isArray(t.players) ? t.players.join(" & ") : "";
      li.innerHTML =
        `<div class="team-name">${escapeHtml(t.name)}</div>` +
        `<div class="team-players">${escapeHtml(players)}</div>`;
      ul.appendChild(li);
    }
  }

  function renderAll() {
    renderHero();
    renderStats();
    renderLeaderboard();
    renderDoublesLeaderboard();
    renderPlayerFilter();
    renderTeamFilter();
    renderSchedule();
    renderDoublesSchedule();
    renderPlayers();
    renderTeams();
  }

  // -------------------- Modal --------------------

  let currentMatchId = null;
  let currentMatchKind = "singles"; // "singles" | "doubles"

  function findMatch(matchId, kind) {
    if (kind === "doubles") return DOUBLES_SCHEDULE.find((m) => m.id === matchId);
    return SCHEDULE.find((m) => m.id === matchId);
  }

  function matchSides(match, kind) {
    return kind === "doubles"
      ? { p1: match.t1, p2: match.t2 }
      : { p1: match.p1, p2: match.p2 };
  }

  function resultsBucket(kind) {
    return kind === "doubles" ? state.doublesResults : state.results;
  }

  function openMatchModal(matchId, kind) {
    kind = kind || "singles";
    const match = findMatch(matchId, kind);
    if (!match) return;
    currentMatchId = matchId;
    currentMatchKind = kind;
    const sides = matchSides(match, kind);
    const heading = kind === "doubles"
      ? `Match ${match.id} — Round ${match.round}`
      : `Match #${match.id} — ${fmtDate(match.date)}`;
    document.getElementById("modal-title").textContent = heading;
    document.getElementById("modal-sub").textContent =
      `Best of 3 rounds. Round winner earns ${POINTS_PER_ROUND_WIN} points. R3 only if needed.`;
    document.getElementById("modal-p1").textContent = sides.p1;
    document.getElementById("modal-p2").textContent = sides.p2;

    const rows = document.getElementById("round-rows");
    rows.innerHTML = "";
    const existing = resultsBucket(kind)[matchId] || null;
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
    const match = findMatch(currentMatchId, currentMatchKind);
    if (!match) return;
    const sides = matchSides(match, currentMatchKind);
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
              `Points — ${escapeHtml(sides.p1)}: <strong>${p1Pts}</strong> · ` +
              `${escapeHtml(sides.p2)}: <strong>${p2Pts}</strong>`;
    if (filled === ROUNDS_PER_MATCH || p1RW >= ROUND_WINS_TO_WIN_MATCH || p2RW >= ROUND_WINS_TO_WIN_MATCH) {
      let winner = "Tie";
      if (p1RW > p2RW) winner = sides.p1;
      else if (p2RW > p1RW) winner = sides.p2;
      msg += `<br>🏆 Winner: <strong>${escapeHtml(winner)}</strong>`;
    } else {
      msg += `<br>Best of 3 — first to ${ROUND_WINS_TO_WIN_MATCH} round wins takes the match.`;
    }
    document.getElementById("modal-summary").innerHTML = msg;
  }

  function closeModal() {
    document.getElementById("score-modal").hidden = true;
    currentMatchId = null;
    currentMatchKind = "singles";
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
    resultsBucket(currentMatchKind)[currentMatchId] = { rounds };
    saveState();
    closeModal();
    renderAll();
  }

  function clearMatch() {
    if (currentMatchId == null) return;
    if (!confirm("Clear scores for this match?")) return;
    delete resultsBucket(currentMatchKind)[currentMatchId];
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
    const teams = Array.isArray(remote.teams) && remote.teams.length
      ? remote.teams
      : state.teams;
    const results = remote.results && typeof remote.results === "object"
      ? remote.results
      : {};
    const doublesResults = remote.doublesResults && typeof remote.doublesResults === "object"
      ? remote.doublesResults
      : {};
    state = { players, teams, results, doublesResults };
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

    const teamFilterEl = document.getElementById("filter-team");
    if (teamFilterEl) teamFilterEl.addEventListener("change", renderDoublesSchedule);
    const doublesStatusEl = document.getElementById("filter-doubles-status");
    if (doublesStatusEl) doublesStatusEl.addEventListener("change", renderDoublesSchedule);

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

    autoSyncOnLoad();
  });
})();