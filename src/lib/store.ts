import type { Group, Session } from "./types"

const SESSION_KEY = "splitway:v1"
const GROUPS_KEY = "splitway:v2"

let sessionMemory: Session = { people: [], expenses: [] }
let groupsMemory: Group[] | null = null

function emptySession(): Session {
  return { people: [], expenses: [] }
}

function cloneSession(session: Session): Session {
  return {
    people: session.people.map((p) => ({ ...p })),
    expenses: session.expenses.map((e) => ({
      ...e,
      participantIds: [...e.participantIds],
      exactCents: e.exactCents ? { ...e.exactCents } : undefined,
    })),
  }
}

function cloneGroup(group: Group): Group {
  return {
    id: group.id,
    name: group.name,
    ...cloneSession(group),
    ...(group.settledKeys ? { settledKeys: [...group.settledKeys] } : {}),
    ...(group.lastPaidBy ? { lastPaidBy: group.lastPaidBy } : {}),
    ...(group.lastParticipantIds
      ? { lastParticipantIds: [...group.lastParticipantIds] }
      : {}),
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && window.localStorage != null
}

function isGroup(value: unknown): value is Group {
  if (!value || typeof value !== "object") return false
  const g = value as Group
  return (
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    Array.isArray(g.people) &&
    Array.isArray(g.expenses)
  )
}

/** Merge v2 groups with a one-shot wrap of a leftover v1 session. */
export function parseGroups(v2raw: string | null, v1raw: string | null): Group[] {
  if (v2raw != null) {
    try {
      const parsed = JSON.parse(v2raw) as { groups?: unknown }
      if (parsed && Array.isArray(parsed.groups)) {
        return parsed.groups.filter(isGroup).map(cloneGroup)
      }
    } catch {
      /* fall through to v1 */
    }
  }
  if (v1raw == null) return []
  try {
    const parsed = JSON.parse(v1raw) as Session
    if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.expenses)) {
      return []
    }
    if (parsed.people.length === 0 && parsed.expenses.length === 0) return []
    return [
      {
        id: "migrated",
        name: "My group",
        ...cloneSession(parsed),
      },
    ]
  } catch {
    return []
  }
}

export function load(): Session {
  if (!canUseStorage()) return cloneSession(sessionMemory)
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (raw == null) return emptySession()
  try {
    const parsed = JSON.parse(raw) as Session
    if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.expenses)) {
      return emptySession()
    }
    return cloneSession(parsed)
  } catch {
    return emptySession()
  }
}

export function save(session: Session): void {
  const copy = cloneSession(session)
  if (!canUseStorage()) {
    sessionMemory = copy
    return
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(copy))
}

export function loadGroups(): Group[] {
  if (!canUseStorage()) return groupsMemory ? groupsMemory.map(cloneGroup) : []
  return parseGroups(
    window.localStorage.getItem(GROUPS_KEY),
    window.localStorage.getItem(SESSION_KEY),
  )
}

export function saveGroups(groups: Group[]): void {
  const copy = groups.map(cloneGroup)
  if (!canUseStorage()) {
    groupsMemory = copy
    return
  }
  window.localStorage.setItem(GROUPS_KEY, JSON.stringify({ groups: copy }))
}

export function loadGroup(id: string): Group | null {
  return loadGroups().find((g) => g.id === id) ?? null
}

export function upsertGroup(group: Group): void {
  const groups = loadGroups()
  const i = groups.findIndex((g) => g.id === group.id)
  if (i === -1) groups.push(cloneGroup(group))
  else groups[i] = cloneGroup(group)
  saveGroups(groups)
}

export function removeGroup(id: string): void {
  saveGroups(loadGroups().filter((g) => g.id !== id))
}

export function sessionOf(group: Group): Session {
  return { people: group.people, expenses: group.expenses }
}

/** Same `{ groups }` envelope `saveGroups` writes. */
export function serializeGroups(groups: Group[]): string {
  return JSON.stringify({ groups: groups.map(cloneGroup) })
}

/** Returns null if the JSON is not a v2 groups envelope. */
export function deserializeGroups(json: string): Group[] | null {
  try {
    const parsed = JSON.parse(json) as { groups?: unknown }
    if (!parsed || !Array.isArray(parsed.groups)) return null
    return parsed.groups.filter(isGroup).map(cloneGroup)
  } catch {
    return null
  }
}
