import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  balances,
  equalShares,
  exactShares,
  formatLkr,
  load,
  save,
  settle,
  toCents,
  type Session,
} from "./index"

describe("toCents", () => {
  it('parses decimal text so "3333.33" is 333333 cents', () => {
    assert.equal(toCents("3333.33"), 333333)
    assert.equal(toCents("12000"), 1_200_000)
    assert.equal(toCents(12000), 1_200_000)
  })
})

describe("formatLkr", () => {
  it("renders cents as LKR with two decimal places", () => {
    assert.equal(formatLkr(1_200_000), "Rs. 12,000.00")
  })
})

describe("equalShares", () => {
  it("splits Rs. 100.00 equally among 3 people so shares sum to 10000 cents", () => {
    const shares = equalShares(toCents("100.00"), ["c", "a", "b"])
    const values = Object.values(shares)
    assert.equal(values.reduce((a, b) => a + b, 0), 10_000)
    assert.deepEqual(shares, { a: 3334, b: 3333, c: 3333 })
  })

  it("is deterministic for the same expense id", () => {
    const ids = ["p1", "p2", "p3"]
    assert.deepEqual(
      equalShares(10_000, ids, "exp-1"),
      equalShares(10_000, ids, "exp-1"),
    )
  })
})

describe("exactShares", () => {
  it("throws when exact amounts do not sum to the total", () => {
    assert.throws(
      () => exactShares(10_000, { a: 3000, b: 3000, c: 3000 }),
      /sum/,
    )
  })

  it("returns the given map when cents sum exactly", () => {
    const exact = { a: 333_333, b: 333_333, d: 333_334 }
    assert.deepEqual(exactShares(1_000_000, exact), exact)
  })
})

describe("AT-01 sanity scenario", () => {
  const alice = "alice"
  const bob = "bob"
  const carol = "carol"
  const dave = "dave"

  const session: Session = {
    people: [
      { id: alice, name: "Alice" },
      { id: bob, name: "Bob" },
      { id: carol, name: "Carol" },
      { id: dave, name: "Dave" },
    ],
    expenses: [
      {
        id: "e1",
        amountCents: 1_200_000,
        paidBy: alice,
        participantIds: [alice, bob, carol, dave],
        splitType: "equal",
      },
      {
        id: "e2",
        amountCents: 1_000_000,
        paidBy: carol,
        participantIds: [alice, bob, dave],
        splitType: "exact",
        exactCents: { [alice]: 333_333, [bob]: 333_333, [dave]: 333_334 },
      },
      {
        id: "e3",
        amountCents: 600_000,
        paidBy: dave,
        participantIds: [dave, bob],
        splitType: "equal",
      },
    ],
  }

  it("computes nets that sum to 0 and match the sanity figures", () => {
    const nets = balances(session)
    const sum = Object.values(nets).reduce((a, b) => a + b, 0)
    assert.equal(sum, 0)
    assert.equal(nets[alice], 566_667)
    assert.equal(nets[bob], -933_333)
    assert.equal(nets[carol], 700_000)
    assert.equal(nets[dave], -333_334)
  })

  it("gives Bob 300000 cents of expense 3 and Carol 0 of expense 2", () => {
    const e3 = equalShares(600_000, [dave, bob], "e3")
    assert.equal(e3[bob], 300_000)
    const e2 = exactShares(1_000_000, {
      [alice]: 333_333,
      [bob]: 333_333,
      [dave]: 333_334,
    })
    assert.equal(e2[carol], undefined)
  })

  it("settles in at most 3 transfers and zeros all nets", () => {
    const nets = balances(session)
    const transfers = settle(nets)
    assert.ok(transfers.length <= 3)

    const leftover = { ...nets }
    for (const t of transfers) {
      leftover[t.from]! += t.amountCents
      leftover[t.to]! -= t.amountCents
    }
    for (const net of Object.values(leftover)) assert.equal(net, 0)
  })
})

describe("store", () => {
  it("round-trips a session in memory when window is missing", () => {
    const session: Session = {
      people: [{ id: "a", name: "Ann" }],
      expenses: [],
    }
    save(session)
    assert.deepEqual(load(), session)
  })
})
