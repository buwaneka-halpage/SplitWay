import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  balances,
  equalShares,
  exactShares,
  settle,
  toCents,
  type Expense,
  type Person,
  type Session,
} from "./index"

function people(names: string[]): Person[] {
  return names.map((name) => ({ id: name.toLowerCase(), name }))
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

function at01(): Session {
  const [alice, bob, carol, dave] = people(["Alice", "Bob", "Carol", "Dave"])
  return {
    people: [alice, bob, carol, dave],
    expenses: [
      {
        id: "e1",
        amountCents: toCents("12000"),
        paidBy: alice.id,
        participantIds: [alice.id, bob.id, carol.id, dave.id],
        splitType: "equal",
      },
      {
        id: "e2",
        amountCents: toCents("10000"),
        paidBy: carol.id,
        participantIds: [alice.id, bob.id, dave.id],
        splitType: "exact",
        exactCents: {
          [alice.id]: toCents("3333.33"),
          [bob.id]: toCents("3333.33"),
          [dave.id]: toCents("3333.34"),
        },
      },
      {
        id: "e3",
        amountCents: toCents("6000"),
        paidBy: dave.id,
        participantIds: [dave.id, bob.id],
        splitType: "equal",
      },
    ],
  }
}

describe("proposal: group size", () => {
  it("splits equally for 2 people", () => {
    const ids = ["a", "b"]
    const shares = equalShares(10_000, ids)
    assert.equal(sum(Object.values(shares)), 10_000)
    assert.equal(shares.a, 5_000)
    assert.equal(shares.b, 5_000)
  })

  it("splits equally for 10 people", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`)
    const shares = equalShares(10_000, ids)
    assert.equal(Object.keys(shares).length, 10)
    assert.equal(sum(Object.values(shares)), 10_000)
  })
})

describe("proposal: you must explicitly handle rounding", () => {
  it("Rs. 100.00 among 3 people sums to 10000 cents, not 9999 or 10001", () => {
    const shares = equalShares(toCents("100.00"), ["x", "y", "z"])
    const total = sum(Object.values(shares))
    assert.equal(total, 10_000)
    assert.notEqual(total, 9_999)
    assert.notEqual(total, 10_001)
    const values = Object.values(shares).sort((a, b) => a - b)
    assert.deepEqual(values, [3333, 3333, 3334])
  })
})

describe("proposal: exact amount split", () => {
  it("accepts exact cents that sum to the total", () => {
    const exact = { a: 333_333, b: 333_333, d: 333_334 }
    assert.deepEqual(exactShares(1_000_000, exact), exact)
  })

  it("rejects exact cents that do not sum to the total", () => {
    assert.throws(() => exactShares(10_000, { a: 4000, b: 4000 }), /sum/)
  })
})

describe("proposal: AT-01 sanity scenario", () => {
  it("matches expected nets, sums to zero, and does not double-count Bob", () => {
    const session = at01()
    const nets = balances(session)
    assert.equal(sum(Object.values(nets)), 0)
    assert.equal(nets.alice, 566_667)
    assert.equal(nets.bob, -933_333)
    assert.equal(nets.carol, 700_000)
    assert.equal(nets.dave, -333_334)
    assert.equal(equalShares(600_000, ["dave", "bob"], "e3").bob, 300_000)
  })

  it("settle-up is minimized (not every pairwise debt) and zeros nets", () => {
    const nets = balances(at01())
    const transfers = settle(nets)
    const pairwiseCeiling = 6
    assert.ok(transfers.length <= 3)
    assert.ok(transfers.length < pairwiseCeiling)
    const leftover = { ...nets }
    for (const t of transfers) {
      leftover[t.from]! += t.amountCents
      leftover[t.to]! -= t.amountCents
    }
    for (const net of Object.values(leftover)) assert.equal(net, 0)
  })
})

describe("proposal: edit and delete recalculate", () => {
  it("recomputes nets after editing an expense", () => {
    const session = at01()
    const before = balances(session)
    const edited: Expense = {
      ...session.expenses[0]!,
      amountCents: 2_000_000,
    }
    const after = balances({
      ...session,
      expenses: [edited, session.expenses[1]!, session.expenses[2]!],
    })
    assert.equal(sum(Object.values(after)), 0)
    assert.notEqual(after.alice, before.alice)
  })

  it("recomputes nets after deleting an expense", () => {
    const session = at01()
    const after = balances({
      ...session,
      expenses: session.expenses.filter((e) => e.id !== "e3"),
    })
    assert.equal(sum(Object.values(after)), 0)
    assert.equal(after.dave, -633_334)
    assert.equal(after.bob, -633_333)
  })
})

describe("engine guards", () => {
  it("throws on an empty participant list", () => {
    assert.throws(() => equalShares(100, []), /participant/)
  })

  it("throws on invalid rupee text", () => {
    assert.throws(() => toCents("abc"), /Invalid/)
  })

  it("allows a payer who is not in the split", () => {
    const session: Session = {
      people: people(["Alice", "Bob", "Carol"]),
      expenses: [
        {
          id: "e",
          amountCents: 10_000,
          paidBy: "carol",
          participantIds: ["alice", "bob"],
          splitType: "equal",
        },
      ],
    }
    const nets = balances(session)
    assert.equal(sum(Object.values(nets)), 0)
    assert.equal(nets.carol, 10_000)
    assert.equal(nets.alice, -5_000)
    assert.equal(nets.bob, -5_000)
  })
})
