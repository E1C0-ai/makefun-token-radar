# Token Launch Radar — make.fun bounty `token-radar-01`

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/E1C0-ai/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/E1C0-ai/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Build the best token launch radar. $1,325 USDC, 10 places paid.
Deadline: **2026-12-14 10:00 UTC (18:00 Beijing)**.

The program reads a sealed snapshot of every protocol DefiLlama tracks, works
out which ones still record no token, ranks them by what their launch would be
worth, and writes a web dashboard: the board, a detail view for every protocol
and the steps to farm it.

## Data

Sealed snapshot `input/snapshot.json` (from the bounty kit, `GET /c/token-radar-01/kit`):
DefiLlama `https://api.llama.fi/protocols`, fetched **2026-11-14**. 758 protocols,
floor **$50,000,000** TVL, **40** on the watchlist. Every number on the board
comes from this file; no protocol name is ever special-cased and nothing is
hand-listed.

Data quirks found while building:

- One protocol (`AUTOfinance`) carries `mcap_usd: -1`, a DefiLlama sentinel for
  an unknown market cap. The model treats a market cap as real only when it is
  above zero, so this row is not used as a pricing peer.
- The kit's header mentions a $5,000,000 floor; the snapshot's own `floor_usd`
  is 50,000,000 and that is the value the program uses.

## Method (`lib/model.ts`, model `radar-2`)

**Pre-token.** A protocol is pre-token when its record carries no token at all:
no market cap, no CoinGecko id, no symbol. 342 of the 758 qualify.

**Rankable.** Pre-token, not a centralised exchange (an exchange is not farmable
on-chain) and not a versioned pool (a name ending in a release, e.g. "Aera V2",
which is a pool of another protocol, not a launch of its own).

**Board.** The watchlist is the floor, never the ceiling: all 40 watchlist slugs
are ranked. Below it, the early radar carries the 160 largest remaining
rankable protocols under the $50,000,000 floor, by TVL. **200 rows** in all.

**Implied value.** From the snapshot's own figures only:

```
peer multiple  = mcap_usd / tvl_usd of each tokenised protocol
cat multiple   = median of the peers in the protocol's category
multiple       = (n_cat * cat + 5 * global) / (n_cat + 5), clamped [0.05, 1.5]
base           = tvl_usd * multiple
growth         = clamp(change_7d, -60%, +120%)
growth mult    = 1 + growth * 0.5
maturity       = 0.6 + min(age_days, 1095) / 1095 * 0.4   (age unknown: 365)
implied        = max(1, round(base * growth mult * maturity))
```

The multiple is the market speaking, not a guess: each category's median
market-cap-to-TVL ratio among the tokenised protocols in this same snapshot
(128 peers, global median 0.214), shrunk toward the global median with a prior
weight of 5 so a category with one peer cannot swing the board. The dashboard
states the model and lets the reader switch the multiple back to the flat 0.25
house constant to see how the ranking moves.

**Farm plan.** Six steps per protocol, generated from that protocol's own record
(category, chains, TVL, age): a fresh wallet, one real position sized from TVL,
one qualifying action a week, a hold of 30–60 days by age, claim only from a
link the protocol itself publishes, and a farm log. Each step states its cost
and time. No step claims a protocol runs a points program or will airdrop:
an airdrop is never guaranteed, and the dashboard says so.

**Live view.** The 24 largest tokenised protocols by market cap (exchanges
excluded), shown with the market's own values so the board's multiples can be
checked against real prices.

## Build

Requires Node.js 22.18 or later (tested with Node 24.22.1), standard library
only — no dependencies to install.

```sh
# first run: writes board.json, data.js and dashboard/ to out/
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input kit/token-radar-01-kit/input/snapshot.json

# screenshots (needs a headless Chromium; shoot.py uses the Playwright cache)
python3 shoot.py        # writes screenshots/1-board.png, 2-detail.png, 3-filtered.png

# second run: copies the screenshots in and writes out/dossier.json
MAKEFUN_OUTPUT_DIR=out node main.ts --input kit/token-radar-01-kit/input/snapshot.json
```

In the grader's container the input is mounted at `/input` and the output goes
to `/output`, so plain `node main.ts` works there.

Output layout (`out/`):

- `board.json` — `{ rows: [...] }`, 200 rows with ranks, implied values, the
  model breakdown and farm steps
- `data.js` — `window.RADAR = {...}`, the dashboard's dataset (200 rows + 24 live)
- `dashboard/` — `index.html`, `app.css`, `app.js` (22,655 bytes total, no
  framework, no network)
- `screenshots/` — board, detail and filtered views, 1440×900 PNG
- `dossier.json` — built with the vendored `vendor/makefun-board.ts`, the kit's
  library shipped byte for byte for this purpose

## View

Open `out/dashboard/index.html` in a browser. It renders with no network: the
only requests are the local `index.html`, `app.css`, `data.js` and `app.js`.
Search, category/chain filters, watchlist-only, four sort orders, a detail view
with the model breakdown and farm plan for every protocol, a live-token view,
and a model sandbox that re-ranks the board in the page.

## Validation

- `validate.py` — 26 checks, all passing: 200 rows, 40/40 watchlist, ranks
  1–200 sequential, sorted by implied value, all rows pre-token, farm steps
  3–12 × 20–600 characters, no CEX or versioned-pool rows, an independent
  Python recompute of all 200 implied values and multiples (0 mismatches),
  dashboard limits, no network address in the dashboard source, screenshots
  within their limits, dossier schema and size.
- `check_interactive.py` — 13 checks in a headless browser, all passing:
  200 rows render, search, sort, watchlist filter, detail view, six farm
  steps, sandbox re-ranking, live and how tabs, zero console errors.

## Status

Development only. Not registered, not submitted: no make.fun account was
created, no wallet was linked, nothing was signed. What remains for the main
flow: create the public GitHub repository (after the competition opened, MIT
license), push this code, take the agent transcripts bundle, and submit with
the payout wallet.
