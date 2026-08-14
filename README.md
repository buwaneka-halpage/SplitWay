# SplitWay

SplitWay is a single-session web app that records shared expenses in Sri Lankan Rupees (LKR) and shows who owes whom. There is no login and no user accounts: one anonymous browser session, add people, log expenses, read running balances, settle up.

It is a Next.js App Router + TypeScript app. Session data stays in the browser. There is no backend and no secrets, so there is no `.env`.

Design docs:

- [Product proposal](docs/PROJECT_PROPOSAL.md)
- [Software requirements specification](docs/SRS.md)
- [Software architecture document](docs/SAD.md)

## How to run

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Engine tests, including acceptance scenario AT-01 (Alice, Bob, Carol, Dave):

```bash
npm test
```

End-to-end tests (Playwright, same proposal scenario through the UI):

```bash
npx playwright install chromium
npm run test:e2e
```

## Assumptions

**No accounts.** The spec is a single-session tool, not a multi-user service. Anyone with the page open can add people and expenses. Skipping identity kept the work on split and settle math.

**Persistence.** The session (`people` + `expenses`) is saved under the `localStorage` key `splitway:v1`. A refresh restores the same group. Tests use an in-memory fallback when `window` is missing. localStorage was chosen so time went into split/settle logic instead of servers, databases, or sync.

**LKR only.** Amounts are typed as rupees and stored as integer cents. There is no currency code per expense and no conversion.

**Split types.** Equal, and exact amount. Percentage split was the other allowed option; exact amount was picked because it is what people already know they paid, and it maps cleanly onto integer cents. `SplitType` is `"equal" | "exact"`.

**Integer cents.** All stored amounts and all arithmetic use cents. Display uses rupees with two decimal places. Equal splits use the Hamilton (largest remainder) method so leftover cents are distributed and shares always sum to the expense total. Splitting Rs. 100 among 3 people never yields Rs. 99.99 or Rs. 100.01. Exact splits are rejected unless the given cents sum to the total; they are not renormalized.

**Settle-up.** Greedy largest-debtor vs largest-creditor: repeatedly transfer `min(|debt|, credit)` until every net is 0. For `n` people with a non-zero net, the plan has at most `n − 1` payments. It is not a list of pairwise IOUs from each expense.

## How rounding works

Money is never added or compared as IEEE-754 rupee floats. An equal split floors each share (`floor(totalCents / n)`), then gives the leftover cents (`totalCents % n`) out one at a time by largest remainder, with ties broken by stable sorted person id. Example: Rs. 100.00 is 10000 cents among 3 people. Base share is 3333 cents; leftover is 1 cent. The shares are 3334, 3333, 3333 in deterministic id order. Sum is 10000 cents (Rs. 100.00), not 9999 or 10001. Exact-amount shares must already sum to the total or the log/edit is rejected.

## What was left incomplete

Correctness of shares, nets, and settle-up was prioritized over covering every extra feature.

- **UI polish** is out of scope. The page is usable (people → expenses → balances → settle up) on a desktop browser. Mobile layout and visual design were not the goal.
- **Percentage split** was not built. Exact amount covers the second required split type.
- **Bonus invalid-total handling** (percentages ≠ 100%, or silently fixing exact amounts that do not sum) was skipped. Exact mismatches fail closed so a bad row cannot quietly unbalance the session.

## What would come next

With more time, in this order:

1. Percentage split, still in integer cents, with a clear reject (or an explicit leftover rule) when weights do not sum to 100%.
2. A better exact-split error in the UI when cents do not sum to the total, without changing the fail-closed engine.
3. Mobile layout and small UX cleanup (the flow is already there).
4. Only after that: optional export/import of the session JSON. Still no accounts.
