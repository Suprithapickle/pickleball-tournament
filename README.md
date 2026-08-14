# 🏓 Pickleball Tournament — Web Scoreboard

A static single-page web app to run a pickleball tournament: players, match
schedule, per-round score entry, and a live points leaderboard. Designed to be
hosted for free on **GitHub Pages**.

Based on the tournament format:

- **10 players**, **45 matches**
- **3 rounds per match**, **2 points per round win** (max 6 pts/match)
- **Aug 6 – Aug 20, 2026** · Thu / Fri / Sat evenings, 5:30 PM, 2 grounds (A & B)

## Features

- 📊 **Dashboard** — tournament stats, points leaderboard (auto-ranked), and "Next Up" match cards.
- 📅 **Schedule** — all 45 matches grouped by date, filterable by player and status. Click any match to enter or edit scores.
- 👥 **Players** — see the roster, add new players.
- 💾 **Data** — export / import all results as JSON, or reset scores.
- 🔒 All data is stored **locally in the browser** (`localStorage`) — no backend, no login required.

## Running locally

Just open `index.html` in a browser. Or from the repo folder:

```powershell
# Any static server works. Example using Python:
python -m http.server 8080
# then browse to http://localhost:8080
```

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `pickleball-tournament`).
2. Commit and push all files at the root of the repo:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `README.md`
3. On GitHub: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`), folder `/ (root)`
4. Wait a minute — your site will be live at
   `https://<your-username>.github.io/<repo-name>/`.

That's it. No build step, no dependencies.

## Sharing scores across devices

Because data is stored in each browser's `localStorage`, two people scoring on
two different phones won't automatically see each other's updates.

Options:

- **Single scorekeeper** — one person owns the scores on one device.
- **Export / Import** — use the `💾 Data` tab to export a JSON file and share it
  (e.g. commit `pickleball-tournament-results.json` into the repo). Others can
  then `Import JSON` to load the latest state.

## Editing the schedule / roster

- Players and the full schedule live in [`data.js`](data.js). Edit that file to
  add matches, change dates, or swap players in the base tournament.
- Ad-hoc new players (post-launch) can be added from the **Players** tab; but
  those players are not automatically slotted into new matches.

## File overview

| File | Purpose |
| --- | --- |
| [`index.html`](index.html) | App shell, tabs, modal for score entry |
| [`styles.css`](styles.css) | Dark-themed styling |
| [`app.js`](app.js) | State, scoring math, rendering, import/export |
| [`data.js`](data.js) | Players, schedule, tournament metadata |

## Scoring rules (as implemented)

- Each match is exactly **3 rounds**.
- A round winner is the side with the higher round score.
- Round winner earns **2 points**; loser earns **0**.
- A round with equal scores contributes 0 points to both.
- A match is **complete** only when all 3 rounds have both scores entered. The
  match winner is the player who won more rounds; equal rounds = "Tie".
- The leaderboard only counts **completed** matches for Played / Wins / Losses,
  but Points and Round Wins accumulate from every recorded round.

Leaderboard tie-breakers: points → wins → round wins → name.
