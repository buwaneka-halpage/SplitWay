# SplitWay agent prompts

Mastermind copy-paste prompts. Each prompt is self-contained. Public GitHub repo: `https://github.com/buwaneka-halpage/SplitWay`.

**Hard rules for every coding agent**

- Product is designed and built from scratch. Do not name, cite, or allude to any existing expense-splitter product in commits, PRs, issues, docs, comments, or code.
- No auth, no user accounts, no Supabase, no extra features.
- Functionality over UI polish.
- Branch from latest `main` → commit → push → `gh pr create` with `Fixes #<n>` in the body. Do **not** merge. Mastermind merges.
- Do not touch files another agent owns (see assignment table).
- Never commit `.env`.

## Assignment table

| Agent | Issues | Owns | Wave |
|-------|--------|------|------|
| Agent-Proposal | #1 | `docs/Project-Expense-Splitter.docx`, `docs/PROJECT_PROPOSAL.md` | 0 (mastermind) |
| Agent-Research | none (internal) | no repo writes | 1 |
| Agent-SRS | #2 | `docs/SRS.md` | 1 |
| Agent-SAD | #3 | `docs/SAD.md`, `docs/diagrams/**` | 1 |
| Agent-Scaffold | #4 | Next.js app files; must not touch `docs/` or `prompts.md` | 1 |
| Agent-Engine | #5 #6 #7 #8 #9 #10 #11 | `src/lib/**` only | 2 |
| Agent-UI | #13 | `src/app/**`, `src/components/**` | 2 |
| Agent-Readme | #12 | `README.md` | 3 |
| Agent-Test | #20 | `src/lib/*.test.ts`, `e2e/**`, `playwright.config.ts`, `data-testid` on UI | 4 |
| Agent-PWA | #21 | `src/app/manifest.ts`, icons, layout metadata, optional service worker | 5 |

Engine public API (lock this; UI imports it):

```ts
export type PersonId = string
export type Person = { id: PersonId; name: string }
export type SplitType = "equal" | "exact"
export type Expense = {
  id: string
  amountCents: number
  paidBy: PersonId
  participantIds: PersonId[]
  splitType: SplitType
  exactCents?: Record<PersonId, number>
}
export type Session = { people: Person[]; expenses: Expense[] }
export type Transfer = { from: PersonId; to: PersonId; amountCents: number }

toCents(input: string | number): number
formatLkr(cents: number): string
equalShares(totalCents: number, participantIds: PersonId[], expenseId?: string): Record<PersonId, number>
exactShares(totalCents: number, exactCents: Record<PersonId, number>): Record<PersonId, number>
balances(session: Session): Record<PersonId, number>
settle(nets: Record<PersonId, number>): Transfer[]
load(): Session
save(session: Session): void
```

Currency: LKR. Persistence: `localStorage` key `splitway:v1`.

---

## Prompt 0 — Agent-Proposal (done by mastermind)

Already on `main`: original Word file at `docs/Project-Expense-Splitter.docx` and a verbatim transcription at `docs/PROJECT_PROPOSAL.md`. Closes #1.

---

## Prompt R — Agent-Research (done)

Internal. Findings folded into Prompt 5 rounding rules. No repo writes.

---

## Prompt 2 — Agent-SRS

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/2 in repo `/Users/berzerk/Projects/SplitWay` (or your isolated worktree of it).

**Goal:** Author `docs/SRS.md` from `docs/PROJECT_PROPOSAL.md`. Present SplitWay as designed from scratch.

**Branch:** `docs/srs`  
**PR title:** `docs: software requirements specification`  
**PR body:** must include `Fixes #2`

**Write:** IEEE-style but short.

Required sections:

- Purpose and scope (single-session LKR expense splitter, no login)
- Definitions (person, expense, share, balance, settlement, cent)
- Assumptions: localStorage, LKR only, exact-amount as the second split type, Next.js + TypeScript
- Actors: one anonymous user
- Functional requirements FR-01..FR-10 covering: add/remove people; log equal expense; log exact-amount expense; edit expense; delete expense; running balances; settle-up minimized transactions; rounding so sum of balances is 0; persist session; sanity scenario
- Rounding rule: integer cents; every split's shares sum to the expense total; Rs. 100 / 3 must not yield 99.99 or 100.01. State the fallback: floor each share, leftover cents by largest remainder, equal-split ties broken by stable participant id order. Exact amounts must sum to total or the operation is rejected. Bonus invalid-percentage handling is out of scope.
- Settle-up rule: greedy, match largest debtor to largest creditor, amount = min(|debt|, credit), repeat. At most n-1 payments. Not pairwise IOUs.
- Engine API (copy the TypeScript API from this prompts file)
- Acceptance test AT-01: Alice, Bob, Carol, Dave; Alice paid 12000 equal among 4; Carol paid 10000 exact Alice 3333.33 Bob 3333.33 Dave 3333.34; Dave paid 6000 equal between Dave and Bob. Final balances sum to 0. Settle-up is a minimized set.

**Do not:** implement code, touch `src/`, mention other products, rewrite the proposal.

**Done when:** `docs/SRS.md` exists, PR opened with `Fixes #2`.

---

## Prompt 3 — Agent-SAD

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/3.

**Goal:** Software architecture document plus UML 2.0 sequence diagrams.

**Branch:** `docs/sad`  
**PR title:** `docs: software architecture and sequence diagrams`  
**PR body:** `Fixes #3`

**Write:** `docs/SAD.md` covering components (UI, SessionStore, SplitEngine, SettleEngine), data model, rounding algorithm, settle algorithm. Present as from scratch.

**Diagrams:** use the GraphViz toolchain already on this machine (not fake cloud resource icons):

```bash
SKILL_VENV="$HOME/.cursor/skills/azure-architecture-diagrams/.venv"
which dot
"$SKILL_VENV/bin/python" docs/diagrams/scripts/<script>.py
```

Each script: GraphViz DOT that is a UML 2.0 sequence diagram (lifelines, synch messages, return dashed, `alt`/`opt` fragments). Outputs under `docs/diagrams/`:

- PNG, DOT, and draw.io via `graphviz2drawio`
- `outformat` equivalent: write `.dot` then `dot -Tpng`, then `graphviz2drawio file.dot -o file.drawio`

Scripts live in `docs/diagrams/scripts/`. Produce:

- SD-01 Add people
- SD-02 Log equal-split expense
- SD-03 Log exact-amount expense (alt: reject if cents do not sum)
- SD-04 Edit / delete expense
- SD-05 Compute balances (rounding / remainder cents)
- SD-06 Settle up (greedy min cash flow)

Embed the PNGs in `docs/SAD.md`.

Lifelines: User, UI, SessionStore, SplitEngine, SettleEngine.

**Do not:** implement app code, overwrite `docs/PROJECT_PROPOSAL.md` or `docs/SRS.md`.

**Done when:** SAD + six diagram triples exist, PR opened with `Fixes #3`.

---

## Prompt 4 — Agent-Scaffold

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/4.

**Goal:** Next.js App Router + TypeScript scaffold. No split logic yet.

**Branch:** `feat/scaffold`  
**PR title:** `feat: scaffold Next.js app`  
**PR body:** `Fixes #4`

**Do:**

- From the repo root, create a Next.js app with App Router, TypeScript, Tailwind, `src/` directory, no auth, no ESLint drama.
- Prefer: `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes` but **do not overwrite** `docs/`, `prompts.md`, `.gitignore`, or `.git`. If create-next-app refuses a non-empty dir, scaffold in a temp dir and copy app files in.
- `src/app/page.tsx` can be a placeholder heading "SplitWay".
- Add `"test": "node --import tsx --test src/lib/**/*.test.ts"` only if it does not require implementing tests. Skip if that needs extra packages; engine agent will add tests.
- Do not add auth libraries, database clients, or env secrets.

**Do not:** implement people/expenses/balances, edit `docs/`.

**Done when:** `npm install` works, `npm run build` works, PR opened with `Fixes #4`.

---

## Prompt 5 — Agent-Engine

You are implementing issues #5 #6 #7 #8 #9 #10 #11 in one PR.

**Branch:** `feat/split-engine`  
**PR title:** `feat: split, balance, and settle engine`  
**PR body:**

```
Fixes #5
Fixes #6
Fixes #7
Fixes #8
Fixes #9
Fixes #10
Fixes #11
```

**Owns only:** `src/lib/**` (and package.json test script / test runner dep if missing). Do not build UI.

**Implement** the engine API from this file:

- `src/lib/money.ts` — parse/format LKR, integer cents only. No floats for arithmetic.
- `src/lib/splits.ts` — `equalShares`, `exactShares`.
- `src/lib/balances.ts` — net = paid − share. `sum(balances) === 0` always.
- `src/lib/settle.ts` — greedy min cash flow.
- `src/lib/store.ts` — localStorage `splitway:v1`; if `window` missing, in-memory fallback for tests.
- `src/lib/types.ts` — shared types.
- `src/lib/engine.test.ts` — tests below.

**Rounding (locked — required):**

- All money is integer cents. Never add or compare display-unit floats (`10.54 + 8.44`).
- Sort participants by id first so UI order cannot change the result.
- Equal split weights are all `1`. Each person gets `floor(amount × weight / Σweights)`. Leftover `R = amount − Σfloors` (in `[0, n)`) is given out **one cent at a time by largest remainder** (Hamilton): largest `amount×weight − floor×Σweights` first.
- Equal remainders (always on an even split): rotate by `offset = FNV-1a-32(expenseId) % n` (offset `0` if no id). Among ties, smaller `(index − offset + n) % n` wins so the extra cent does not always land on the same people. Same id → same split.
- Shares must sum to `totalCents`. Example: 10000 cents / 3 people → 3334+3333+3333, never 9999 or 10001.
- Exact split: `ΣexactCents === totalCents` with integer `===` or **throw**. Do not dump a mismatch onto the payer. Do not renormalize bad input.
- Balances = `paid − Σinteger shares`. After every mutation, `sum(balances) === 0`. No per-person `Math.round` on floats.

**Settle:** copy nets, partition debtors/creditors, repeatedly pay `min(|debt|, credit)` from largest debtor to largest creditor until all zero. Ignore 0-cent balances.

**Tests that must fail if logic is wrong** (use `node:test` + `tsx`, or vitest if already in the scaffold):

1. Rs. 100.00 equal among 3 people → shares sum to 10000 cents; not 9999 or 10001.
2. Exact amounts that do not sum → throw.
3. Sanity scenario from the proposal, amounts in cents:
   - People A B C D
   - A paid 1_200_000, equal among A,B,C,D
   - C paid 1_000_000, exact A 333333, B 333333, D 333334 (C not in the split)
   - D paid 600_000, equal among D,B
   - `sum(balances) === 0`
   - settle transfers length is minimized (strictly fewer than all pairwise debts; at most 3 for 4 people with mixed signs)
   - nobody missing/double-counted: B's equal share of expense 3 is 300000 cents

**Do not:** mention other products; add percentage split; add auth.

**Done when:** tests pass, PR opened with the Fixes lines above.

---

## Prompt 6 — Agent-UI

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/13.

**Branch:** `feat/app-ui`  
**PR title:** `feat: wire people, expenses, balances, settle UI`  
**PR body:** `Fixes #13`

**Owns:** `src/app/**`, `src/components/**`. Import engine from `@/lib/*`. If engine is not merged yet, still write against the API in this file.

**UI (usable, not pretty):** one page, four sections in order:

1. People — name input, add, list, remove
2. Expenses — amount (LKR), payer, participant checkboxes, split type equal|exact, exact amount inputs when exact, submit, list with edit and delete
3. Balances — each person net owed (positive) or owes (negative), formatted LKR; show that totals sum to Rs. 0.00
4. Settle Up — list of "X pays Y Rs. Z"

Load/save via `store.ts` so refresh keeps the session.

No login. No extra pages. No charts.

**Done when:** the flow works against the engine API, PR opened with `Fixes #13`.

---

## Prompt 7 — Agent-Readme

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/12.

**Branch:** `docs/readme`  
**PR title:** `docs: README`  
**PR body:** `Fixes #12`

Write `README.md`:

- What SplitWay is (from-scratch single-session LKR splitter)
- How to run (`npm install`, `npm run dev`, `npm test`)
- Assumptions: no login; localStorage; LKR; equal + exact splits; integer cents rounding; greedy settle-up
- Rounding explanation (Rs. 100 / 3)
- What was left incomplete and why (UI polish, percentage split, bonus invalid-total handling)
- What you would build next with more time

Do not mention other products. Do not invent a `.env`.

**Done when:** PR opened with `Fixes #12`.

---

## Prompt 8 — Agent-Test (unit + e2e)

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/20.

**Branch:** `test/unit-e2e`  
**PR title:** `test: comprehensive unit and e2e coverage`  
**PR body:** `Fixes #20`

Source of truth for cases: `docs/Project-Expense-Splitter.docx` and `docs/PROJECT_PROPOSAL.md`. Do not name other products.

**Unit tests** (`node:test` + `tsx`, files under `src/lib/*.test.ts`). Cover:

From Core Requirements:

- Add/remove people: 2-person group and 10-person group both compute
- Equal split among selected people
- Exact-amount split that sums to the total
- Exact-amount split that does **not** sum → throw (fail closed; bonus "fix it" is out of scope)
- Edit expense then balances recompute from the full session
- Delete expense then balances recompute
- Running nets: `paid − share`; sum of nets is always `0`
- Settle-up is minimized (at most `n−1` transfers), not every pairwise IOU

From "You Must Explicitly Handle":

- Rs. 100.00 / 3 people → shares sum to 10000 cents, never 9999 or 10001
- AT-01 from the proposal (Alice, Bob, Carol, Dave):
  1. Alice paid Rs. 12,000 equal among 4
  2. Carol paid Rs. 10,000 exact Alice 3333.33, Bob 3333.33, Dave 3333.34 (Carol not in the split)
  3. Dave paid Rs. 6,000 equal between Dave and Bob only
  - nets sum to 0
  - expected cents: Alice +566667, Bob -933333, Carol +700000, Dave -333334
  - Bob's share of expense 3 is 300000 (no double-count)
  - settle length ≤ 3 and zeros all nets

Also: `toCents("3333.33") === 333333` (no IEEE-754); invalid amounts throw; empty participant list throws; payer-not-in-split is valid.

**E2E** with Playwright (`@playwright/test`):

- Drive the real UI: add people → log expenses → view balances → settle up
- AT-01 through the UI (same numbers)
- Rounding visible: Rs. 100 equal among 3, balance sum is Rs. 0.00
- Exact mismatch shows an error and does not save
- Edit and delete an expense; nets change
- Reload: localStorage `splitway:v1` restores people/expenses
- Add `data-testid` hooks on the UI as needed; do not restyle

Scripts: keep `npm test` for unit; add `npm run test:e2e` for Playwright. Playwright `webServer` starts Next on a free port. Gitignore `test-results/` and `playwright-report/`.

**Done when:** `npm test` and `npm run test:e2e` pass, PR opened with `Fixes #20`.

---

## Prompt 9 — Agent-PWA

You are implementing GitHub issue https://github.com/buwaneka-halpage/SplitWay/issues/21.

**Branch:** `feat/pwa`  
**PR title:** `feat: installable PWA for mobile`  
**PR body:** `Fixes #21`

Make SplitWay installable on a phone (Add to Home Screen / standalone). Follow the Next.js App Router PWA guide: `src/app/manifest.ts` (`MetadataRoute.Manifest`), `display: "standalone"`, 192 and 512 PNG icons, `appleWebApp` + viewport `themeColor` in `src/app/layout.tsx`.

Optional: a tiny service worker so the shell loads offline. Prefer Next/Serwist or a small `public/sw.js` — do not add a heavy PWA framework if a manifest + icons already make it installable.

Do not add auth. Do not mention other products. Keep the existing one-page UI.

**Done when:** `app/manifest.ts` serves, icons exist, `npm run build` succeeds, PR opened with `Fixes #21`.
