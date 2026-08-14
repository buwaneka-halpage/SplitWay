import type { Session } from "./types"

const KEY = "splitway:v1"

let memory: Session = { people: [], expenses: [] }

function empty(): Session {
  return { people: [], expenses: [] }
}

function clone(session: Session): Session {
  return {
    people: session.people.map((p) => ({ ...p })),
    expenses: session.expenses.map((e) => ({
      ...e,
      participantIds: [...e.participantIds],
      exactCents: e.exactCents ? { ...e.exactCents } : undefined,
    })),
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && window.localStorage != null
}

export function load(): Session {
  if (!canUseStorage()) return clone(memory)
  const raw = window.localStorage.getItem(KEY)
  if (raw == null) return empty()
  try {
    const parsed = JSON.parse(raw) as Session
    if (!parsed || !Array.isArray(parsed.people) || !Array.isArray(parsed.expenses)) {
      return empty()
    }
    return clone(parsed)
  } catch {
    return empty()
  }
}

export function save(session: Session): void {
  const copy = clone(session)
  if (!canUseStorage()) {
    memory = copy
    return
  }
  window.localStorage.setItem(KEY, JSON.stringify(copy))
}
