# SplitWay mastermind handoff

Repo: https://github.com/buwaneka-halpage/SplitWay  
Live: https://splitway-five.vercel.app  
Vercel project: `splitway`

Read `prompts.md` first. For Next.js APIs, read `node_modules/next/dist/docs/` — this is Next 16.3.1.

## Product

LKR expense splitter. No login, no accounts. Engine in `src/lib/**` (integer cents, equal + exact). Do not change the public API in `prompts.md`. Never name other expense-splitter products. Never commit `.env`, `.env.local`, or `.vercel`.

## Cloud

`.cursor/environment.json` runs `npm ci` then `npm run dev`.

```bash
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:e2e
```

## Tip (this branch)

`cursor/groups-app-layouts-183c` — PR https://github.com/buwaneka-halpage/SplitWay/pull/27

Folded in from GitHub `d2daf08` (`feat/polished-pwa-ui`): maskable icon, service worker `splitway-v2`, live URL, Pixel 5 e2e, 44px tab targets.

## App routes

- `/` — groups list
- `/groups/[groupId]` — expenses (mobile bottom tabs, desktop sidebar)
- `/groups/[groupId]/people`
- `/groups/[groupId]/balances`
- `/groups/[groupId]/settle`

Groups persist under `splitway:v2`. A leftover `splitway:v1` session imports once as **My group**.

## Open

- Issue #26 (polish) — covered by PR #27 plus `d2daf08` PWA bits
- Do not merge. Mastermind merges.
