# SplitWay mastermind handoff

Copy everything below the line into a new agent. You are taking over as **mastermind**, not as a coding sub-agent.

---

You are the mastermind for **SplitWay**.

Repo (local): `/Users/berzerk/Projects/SplitWay`
Public GitHub: https://github.com/buwaneka-halpage/SplitWay
Live (Vercel): https://splitway-five.vercel.app
Vercel project: `splitway` (projectId `prj_MENzLEiOZQUS59ZkzkU5BKskLlag`, org `team_UO0b9w4qogw0XcpnbPsy2HwI`)

Read `prompts.md` first. It is the assignment table, engine API lock, and sub-agent prompt library. Read `docs/PROJECT_PROPOSAL.md`, `docs/SRS.md`, `README.md`. For Next.js APIs, read `node_modules/next/dist/docs/` — this is Next 16.3.1, not the Next you were trained on.

## Product (locked)

Single-session LKR expense splitter. One page. No login, no accounts, no Supabase, no extra features beyond the spec.

- Persistence: `localStorage` key `splitway:v1`
- Currency: LKR, integer cents only
- Splits: equal + exact. No percentage.
- Engine lives in `src/lib/**`. UI imports from `@/lib`. Do not change the public API in `prompts.md`.
- Present the product as designed from scratch. Never name, cite, or allude to any existing expense-splitter product in commits, PRs, issues, docs, comments, or code.
- Never commit `.env`, `.env.local`, or `.vercel`.

## How this project is run

Sub-agents: branch from latest `main` → commit → push → `gh pr create` with `Fixes #<n>` in the body. **Do not merge.** You (mastermind) merge.

Do not touch files another agent owns (see assignment table in `prompts.md`). Never skip git hooks. Never attribute work to Cursor in git/GitHub.

## Waves 0–5: DONE and merged to `main`

`main` is at `7b51104` (`Merge pull request #25 from buwaneka-halpage/fix/apple-icon-metadata`). Remote is in sync.

| Issue | What | PR | State |
|-------|------|----|-------|
| #1 | Proposal docs | (on main from the start) | closed |
| #2 | SRS | #14 `docs/srs` | merged |
| #3 | SAD + UML sequence diagrams | #16 `docs/sad` | merged |
| #4 | Next.js scaffold | #15 `feat/scaffold` | merged |
| #5–#11 | Engine (people, equal, exact, edit/delete, balances, settle, AT-01 test) | #17 `feat/split-engine` | merged |
| #13 | Minimal UI wiring | #18 `feat/app-ui` | merged |
| #12 | README | #19 `docs/readme` | merged |
| #20 | Unit + Playwright e2e | #22 `test/unit-e2e` | merged |
| #21 | Installable PWA | #23 `feat/pwa` | merged |
| (follow-ups) | Apple touch icons + metadata | #24, #25 | merged |

Old agent worktrees still exist locally (`docs/srs`, `docs/sad`, `feat/scaffold`, `feat/split-engine`, `feat/app-ui`, `docs/readme`). Leave them. Do not rebase or delete unless asked.

## Open work: issue #26 — THIS IS THE BALL

**Issue:** https://github.com/buwaneka-halpage/SplitWay/issues/26
**Title:** Feat: polished mobile PWA UI
**No open PR.** No commits on the polish branch.

Checked-out branch: `feat/polished-pwa-ui` — **same commit as `main`**. All polish is **uncommitted working tree**.

The previous agent restyled the one-page flow with shadcn/ui, added a mobile bottom nav, Pixel 5 Playwright project, maskable icon, and deployed **from the local working tree** to Vercel. GitHub `main` still serves the old plain UI. Production currently shows the polish because of that local CLI deploy, not because git has it.

### Uncommitted / untracked (do not lose this)

Modified:

- `src/components/SplitWayApp.tsx` — shadcn cards, 44px tap targets, existing `data-testid`s kept
- `src/components/BottomNav.tsx` (untracked) — mobile-only section jump (`#people` `#expenses` `#balances` `#settle`)
- `src/components/ui/**` (untracked) — shadcn primitives
- `src/lib/utils.ts` (untracked) — `cn()` only. Engine files were not rewritten.
- `src/app/globals.css`, `layout.tsx` (`viewportFit: "cover"`), `manifest.ts` (maskable icon)
- `public/sw.js`, `public/icon-512x512-maskable.png` (untracked)
- `components.json` (untracked)
- `package.json` / lockfile — shadcn, radix-ui, lucide-react, cva, clsx, tailwind-merge, tw-animate-css
- `playwright.config.ts` — added Pixel 5 project next to Desktop Chrome
- `e2e/proposal.spec.ts` — participant checkboxes now handle `aria-checked` (Radix)
- `README.md` — removed “UI polish out of scope”; still says **“Production URL is added after deploy”** — replace with https://splitway-five.vercel.app
- `.gitignore` — extra `.env*` line (redundant; `.env*.local` already ignored)

Do **not** commit `.env.local` or `.vercel/`.

### Finish #26

1. Confirm `npm test` and `npm run test:e2e` pass (e2e now runs twice: chromium + pixel5).
2. Stage the polish files (not secrets). Commit on `feat/polished-pwa-ui`.
3. Push and `gh pr create` with `Fixes #26`. Suggested title: `feat: polished mobile PWA UI`.
4. Mastermind merges after the PR looks right.
5. Confirm Vercel rebuilds from git (today’s live URL may be a CLI deploy of dirty files; git-backed production should match after merge).
6. Put the production URL in `README.md` if that commit is not already in the PR.

Do not change engine math. Do not add auth, routes, or percentage split.

## Engine API (do not drift)

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

AT-01 expected nets (cents): Alice +566667, Bob -933333, Carol +700000, Dave -333334. Sum of balances is always 0.

## After #26

The original proposal is implemented. Optional later (only if the human asks):

- Percentage split (still integer cents)
- Clearer exact-split UI error (engine already fail-closes)
- Session JSON export/import (still no accounts)

Do not invent a new wave. Ask before opening issues.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm test
npx playwright install chromium
npm run test:e2e
```

`.vercel/project.json` is already linked to project `splitway`. Prefer git-backed deploys after the PR lands so production tracks `main`. A later `npx vercel whoami` in this environment reported **Logged out** — if CLI deploy is needed, run `vercel login` first. Production is already up at the URL above.
