# Software requirements specification

**Product:** SplitWay  
**Version:** 1.0  
**Status:** baseline for implementation

This document specifies SplitWay, a single-session web app that records shared expenses in Sri Lankan Rupees (LKR) and computes who owes whom. SplitWay is designed from scratch for this product. It is not a multi-user service.

## 1. Introduction

### 1.1 Purpose

This SRS states the functional requirements, money-handling rules, and engine interface for SplitWay. Implementers of the split engine and the UI shall treat this document as the source of truth for behaviour.

Intended readers: developers implementing the session store, split engine, settle engine, and UI.

### 1.2 Scope

SplitWay is a browser app for one anonymous user. The user adds people, logs expenses, edits or deletes expenses, reads running balances, and sees a settle-up plan.

In scope:

- One local session in the browser. No login, no user accounts, no server-side identity.
- LKR only.
- Two split types: equal, and exact amount.
- Integer-cent arithmetic so every expense's shares sum to its total and the sum of all balances is 0.
- A minimized settle-up plan (not a list of every pairwise debt).

Out of scope:

- Percentage splits.
- Invalid-percentage handling (the proposal's leftover bonus).
- Multi-currency, accounts, cloud sync, and multi-device sessions.
- UI polish beyond a usable add-people → log-expenses → balances → settle-up flow.

### 1.3 Definitions

| Term | Definition |
|------|------------|
| Person | A named participant in the session. Identified by a stable `PersonId` string. |
| Expense | A recorded payment: total in cents, who paid, who shares it, and how it is split. |
| Share | The integer-cent amount of an expense assigned to one person. For one expense, the shares of its participants sum to `amountCents`. |
| Balance (net) | For one person: total paid minus total shares, in cents. Positive means the group owes them. Negative means they owe the group. Zero means settled on paper. |
| Settlement (transfer) | One payment from a debtor to a creditor that reduces both nets. A settle-up plan is a list of transfers that brings every net to 0. |
| Cent | The integer minor unit of LKR. 1 rupee = 100 cents. All stored amounts and all arithmetic use cents. Display uses rupees with two decimal places. |

### 1.4 References

- `docs/PROJECT_PROPOSAL.md`: original product brief this SRS restates as requirements.

## 2. Overall description

### 2.1 Product perspective

SplitWay is a standalone Next.js App Router application written in TypeScript. Session data lives in the browser. There is no backend for identity or persistence.

Logical parts (specified here, implemented later):

- UI: one page, four sections in the order people, expenses, balances, settle up.
- Session store: `load` / `save` of `{ people, expenses }`.
- Split engine: shares, nets, rounding.
- Settle engine: transfers from nets.

### 2.2 Actors

One actor: the anonymous user of the browser session. Anyone with the page open can add people and expenses. There are no roles, permissions, or other users.

### 2.3 Assumptions and constraints

1. Persistence key is `splitway:v1` in `localStorage`. The session is the `people` array plus the `expenses` array. Reloading the page restores that session. If `window` is missing (tests), the store may keep the same shape in memory.
2. Currency is LKR. The product does not convert currencies or store a currency code per expense.
3. The second split type is exact amount, not percentage. `SplitType` is `"equal" | "exact"`.
4. Stack is Next.js App Router and TypeScript. The engine API in section 5 is the contract the UI imports.
5. Person names are non-empty strings. Duplicate names are allowed; identity is `id`, not name.
6. A person may be removed only when they are not `paidBy` on any expense and not listed in any `participantIds`.
7. An expense has at least one participant. The payer need not be a participant (they can pay for others only).
8. Amounts the user types are rupees. The engine stores and computes cents.

## 3. Functional requirements

Each requirement is mandatory (`shall`).

### FR-01 Add and remove people

The user shall add a person by name. There is no maximum group size. The system shall assign a stable unique `PersonId`. The user shall remove a person who is not referenced by any expense (assumption 6). After a change, running balances and settle-up shall update, and the session shall be saved (FR-09).

### FR-02 Log an equal-split expense

The user shall log an expense with: amount, payer, participant set, and split type `equal`. The system shall assign shares with `equalShares` (section 4). Shares shall sum to `amountCents`. Balances shall update.

### FR-03 Log an exact-amount expense

The user shall log an expense with split type `exact` and an integer-cent amount per participant. The system shall accept the expense only when those amounts sum to `amountCents`. Otherwise it shall reject the operation and leave the session unchanged. `exactShares` shall return the given cents map when valid.

### FR-04 Edit an expense

The user shall change an existing expense (amount, payer, participants, split type, exact cents). Validation is the same as FR-02 or FR-03. After a successful edit, balances shall be recomputed from the full session, not patched incrementally.

### FR-05 Delete an expense

The user shall delete an expense. Remaining expenses are unchanged. Balances shall be recomputed from the full session.

### FR-06 Running balances

The user shall see each person's net in formatted LKR: owed to them (positive) or owed by them (negative). The displayed nets shall match `balances(session)`. The sum of all nets shall be 0 cents.

### FR-07 Settle up (minimized transactions)

The user shall see a settle-up list of transfers produced by `settle` (section 4). Each line is "from pays to amount". The plan shall bring every net to 0. It shall not enumerate every pairwise IOU from individual expenses. For `n` people with a non-zero net, the plan shall contain at most `n - 1` transfers.

### FR-08 Rounding so balances sum to zero

All split and balance arithmetic shall use integer cents. For every expense, the sum of shares shall equal `amountCents`. Across the session, the sum of nets shall be 0. Splitting Rs. 100.00 among 3 people shall not produce share totals of Rs. 99.99 or Rs. 100.01. The algorithm is section 4.1.

### FR-09 Persist the session

After every successful add, remove, log, edit, or delete, the system shall `save` the session under `splitway:v1`. On load, the system shall `load` that session so a refresh keeps people and expenses.

### FR-10 Sanity scenario

The system shall compute AT-01 (section 6) without missing or double-counting any participant. Final nets shall sum to 0. Settle-up shall be a minimized transfer set as in FR-07.

## 4. Money and settle-up rules

### 4.1 Rounding (Hamilton / largest remainder)

Store and compute only integer cents. Do not add, subtract, or compare rupee amounts as IEEE-754 floats.

**Equal split** (`equalShares(totalCents, participantIds)`):

1. Let `n` be the number of participants. If `n` is 0, reject the expense.
2. Base share = `floor(totalCents / n)` for each participant.
3. Leftover cents = `totalCents - n * base`.
4. Fractional remainder for participant `i` is `(totalCents / n) - base` (equivalently `totalCents % n` is the leftover count; remainders are equal when leftover is distributed by the tie-break below).
5. Give one extra cent to leftover participants, chosen by largest remainder (Hamilton method).
6. When remainders tie, assign extra cents in stable sorted `PersonId` order (lexicographic ascending). Do not use display name or insertion order.

Worked example: Rs. 100.00 is 10000 cents among 3 people. Base = 3333. Leftover = 1. After the tie-break, the shares are 3334, 3333, 3333 in deterministic id order. Sum = 10000 cents (Rs. 100.00).

**Exact split** (`exactShares(totalCents, exactCents)`):

- If the sum of values in `exactCents` equals `totalCents`, return that map.
- If not, reject. Do not renormalize. Do not round the user's exact figures to force a fit.

Percentage splits and "percentages ≠ 100%" handling are out of scope.

### 4.2 Net balance

For person `p`:

```
net(p) = sum(amountCents of expenses where paidBy = p)
       - sum(p's share on every expense)
```

A person who is not a participant on an expense has share 0 on that expense, including a payer who paid for others only.

`balances(session)` returns a map of every person in `session.people`. People with no payments and no shares are 0. The sum of values is always 0 when FR-08 holds.

### 4.3 Settle-up (greedy min cash flow)

`settle(nets)`:

1. Copy the nets. Ignore 0-cent entries.
2. Partition into debtors (net < 0) and creditors (net > 0).
3. While both sets are non-empty: pick the largest debtor by `|net|` and the largest creditor by `net`. Transfer `min(|debt|, credit)` from debtor to creditor. Reduce both. Drop anyone who reaches 0.
4. Repeat.

Ties when two people have the same `|net|` are broken by stable sorted `PersonId` order.

Properties:

- Amount of each transfer is `min(|debt|, credit)`.
- At most `n - 1` payments for `n` people with non-zero nets.
- The output is not the set of pairwise IOUs implied by each expense.

## 5. Engine API

The UI shall call this TypeScript API. Column names and types are normative.

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
equalShares(totalCents: number, participantIds: PersonId[]): Record<PersonId, number>
exactShares(totalCents: number, exactCents: Record<PersonId, number>): Record<PersonId, number>
balances(session: Session): Record<PersonId, number>
settle(nets: Record<PersonId, number>): Transfer[]
load(): Session
save(session: Session): void
```

Function contracts:

| Function | Behaviour |
|----------|-----------|
| `toCents` | Convert a rupee amount (string or number) to integer cents. String input is parsed as decimal text so the last cent is not changed by binary floats. `"12000"` and `12000` yield `1200000`. `"3333.33"` yields `333333`. |
| `formatLkr` | Render cents as an LKR string with two decimal places (for example `1200000` → a string showing Rs. 12,000.00). |
| `equalShares` | Section 4.1. Returned values sum to `totalCents`. |
| `exactShares` | Section 4.1. Throws or otherwise fails closed if the map does not sum to `totalCents`. |
| `balances` | Section 4.2. |
| `settle` | Section 4.3. |
| `load` / `save` | Read and write `Session` at `localStorage` key `splitway:v1`. |

`amountCents`, share maps, nets, and `Transfer.amountCents` are integers. Negative expense totals are rejected.

## 6. Acceptance test AT-01

People: Alice, Bob, Carol, Dave.

1. Alice paid Rs. 12,000.00, equal among all 4.
2. Carol paid Rs. 10,000.00, exact: Alice Rs. 3,333.33, Bob Rs. 3,333.33, Dave Rs. 3,333.34. Carol is the payer and is not a participant.
3. Dave paid Rs. 6,000.00, equal between Dave and Bob only.

Amounts in cents:

| # | Payer | Total | Split | Shares (cents) |
|---|-------|-------|-------|----------------|
| 1 | Alice | 1_200_000 | equal, all 4 | 300_000 each |
| 2 | Carol | 1_000_000 | exact | Alice 333_333, Bob 333_333, Dave 333_334 |
| 3 | Dave | 600_000 | equal, Dave and Bob | 300_000 each |

Expected nets (paid minus share):

| Person | Cents | Meaning |
|--------|-------|---------|
| Alice | +566_667 | group owes Alice |
| Bob | -933_333 | Bob owes the group |
| Carol | +700_000 | group owes Carol |
| Dave | -333_334 | Dave owes the group |

Pass criteria:

- Sum of the four nets is 0.
- Bob's share of expense 3 is 300_000 cents (not double-counted with expense 1).
- Carol's share of expense 2 is 0.
- `settle` returns a minimized set: at most 3 transfers, not one IOU per expense pair. One valid greedy result is Bob → Carol 700_000, Dave → Alice 333_334, Bob → Alice 233_333 (cents). Equivalent plans that also zero all nets in ≤ 3 transfers are acceptable if they follow section 4.3, including the id tie-break.

## 7. Non-functional notes

- Correctness of shares, nets, and settle-up outranks visual design.
- No authentication, secrets, or `.env` for this product.
- The UI must be usable on a desktop browser. Mobile polish is not required.
