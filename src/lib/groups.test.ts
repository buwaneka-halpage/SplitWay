import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { todayDate } from "./form"
import { transferKey } from "./settle"
import {
  deserializeGroups,
  parseGroups,
  saveGroups,
  loadGroups,
  loadGroup,
  removeGroup,
  serializeGroups,
} from "./store"

describe("parseGroups", () => {
  it("wraps a leftover v1 session as My group", () => {
    const v1 = JSON.stringify({
      people: [{ id: "a", name: "Ann" }],
      expenses: [],
    })
    const groups = parseGroups(null, v1)
    assert.equal(groups.length, 1)
    assert.equal(groups[0].id, "migrated")
    assert.equal(groups[0].name, "My group")
    assert.equal(groups[0].people[0].name, "Ann")
  })

  it("prefers v2 over v1", () => {
    const v2 = JSON.stringify({
      groups: [{ id: "g1", name: "Trip", people: [], expenses: [] }],
    })
    const v1 = JSON.stringify({
      people: [{ id: "a", name: "Ann" }],
      expenses: [],
    })
    const groups = parseGroups(v2, v1)
    assert.equal(groups.length, 1)
    assert.equal(groups[0].name, "Trip")
  })

  it("does not invent a group from an empty v1 session", () => {
    const v1 = JSON.stringify({ people: [], expenses: [] })
    assert.deepEqual(parseGroups(null, v1), [])
  })
})

describe("groups store (in-memory)", () => {
  it("keeps people and expenses isolated per group", () => {
    saveGroups([])
    saveGroups([
      {
        id: "g1",
        name: "Trip",
        people: [{ id: "a", name: "Ann" }],
        expenses: [],
      },
      {
        id: "g2",
        name: "House",
        people: [{ id: "b", name: "Bea" }],
        expenses: [],
      },
    ])
    assert.equal(loadGroup("g1")?.people[0].name, "Ann")
    assert.equal(loadGroup("g2")?.people[0].name, "Bea")
    assert.equal(loadGroup("g1")?.people.length, 1)
    removeGroup("g1")
    assert.equal(loadGroup("g1"), null)
    assert.equal(loadGroups().length, 1)
    assert.equal(loadGroups()[0].name, "House")
  })

  it("round-trips an expense description", () => {
    saveGroups([
      {
        id: "g1",
        name: "Trip",
        people: [{ id: "a", name: "Ann" }],
        expenses: [
          {
            id: "e1",
            amountCents: 10_000,
            paidBy: "a",
            participantIds: ["a"],
            splitType: "equal",
            description: "Dinner",
          },
        ],
      },
    ])
    assert.equal(loadGroup("g1")?.expenses[0].description, "Dinner")
  })

  it("round-trips date, settledKeys, and last-used form fields", () => {
    saveGroups([
      {
        id: "g1",
        name: "Trip",
        people: [{ id: "a", name: "Ann" }],
        expenses: [
          {
            id: "e1",
            amountCents: 10_000,
            paidBy: "a",
            participantIds: ["a"],
            splitType: "equal",
            date: "2026-08-14",
          },
        ],
        settledKeys: ["a\0b\0" + "100"],
        lastPaidBy: "a",
        lastParticipantIds: ["a"],
      },
    ])
    const g = loadGroup("g1")
    assert.equal(g?.expenses[0].date, "2026-08-14")
    assert.deepEqual(g?.settledKeys, ["a\0b\0" + "100"])
    assert.equal(g?.lastPaidBy, "a")
    assert.deepEqual(g?.lastParticipantIds, ["a"])
  })
})

describe("serializeGroups", () => {
  it("round-trips through deserializeGroups", () => {
    const groups = [
      {
        id: "g1",
        name: "Trip",
        people: [{ id: "a", name: "Ann" }],
        expenses: [],
        lastPaidBy: "a",
      },
    ]
    const json = serializeGroups(groups)
    const back = deserializeGroups(json)
    assert.equal(back?.length, 1)
    assert.equal(back?.[0].name, "Trip")
    assert.equal(back?.[0].lastPaidBy, "a")
  })

  it("returns null for junk", () => {
    assert.equal(deserializeGroups("nope"), null)
    assert.equal(deserializeGroups("{}"), null)
  })
})

describe("todayDate", () => {
  it("is a local YYYY-MM-DD", () => {
    assert.match(todayDate(), /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("transferKey", () => {
  it("joins from, to, and cents", () => {
    assert.equal(
      transferKey({ from: "a", to: "b", amountCents: 50 }),
      "a\0b\0" + "50",
    )
  })
})
