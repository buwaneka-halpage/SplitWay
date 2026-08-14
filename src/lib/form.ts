import { toCents } from "./money"
import type { Expense, Person, Session } from "./types"

export function newId(): string {
  return crypto.randomUUID()
}

export function personName(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? id
}

export function isPersonReferenced(session: Session, personId: string): boolean {
  return session.expenses.some(
    (expense) =>
      expense.paidBy === personId || expense.participantIds.includes(personId),
  )
}

export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(Math.trunc(cents))
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}

export function parseCents(raw: string, allowZero: boolean): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const cents = toCents(trimmed)
    if (!Number.isInteger(cents)) return null
    if (allowZero ? cents < 0 : cents <= 0) return null
    return cents
  } catch {
    return null
  }
}

export function formFromExpense(expense: Expense): {
  amount: string
  paidBy: string
  participantIds: string[]
  splitType: Expense["splitType"]
  exactAmounts: Record<string, string>
} {
  const exactAmounts: Record<string, string> = {}
  if (expense.splitType === "exact" && expense.exactCents) {
    for (const [id, cents] of Object.entries(expense.exactCents)) {
      exactAmounts[id] = centsToInput(cents)
    }
  }
  return {
    amount: centsToInput(expense.amountCents),
    paidBy: expense.paidBy,
    participantIds: [...expense.participantIds],
    splitType: expense.splitType,
    exactAmounts,
  }
}
