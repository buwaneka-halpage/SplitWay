import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseGroups, saveGroups, loadGroups, loadGroup, removeGroup } from "./store"

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
})
