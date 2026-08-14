# Handoff

SplitWay is a Next.js PWA. No `.env`, no accounts. Money math is integer cents in `src/lib`. Browser state is `localStorage`.

## Cloud

`.cursor/environment.json` runs `npm ci` then `npm run dev`. There is no database to migrate.

```bash
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:e2e
```

## App routes (layouts)

- `/` — groups list (`src/app/(app)/`)
- `/groups/[groupId]` — expenses, with a persistent group layout and bottom tabs
- `/groups/[groupId]/people`
- `/groups/[groupId]/balances`
- `/groups/[groupId]/settle`

Groups persist under `splitway:v2`. A leftover `splitway:v1` session (people + expenses) is imported once as **My group**.

The split/settle engine is unchanged. Each group is a `Session` (`people` + `expenses`) plus `id` and `name`.
