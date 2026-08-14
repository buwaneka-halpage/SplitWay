import { exactShares, equalShares } from "./splits"
import type { Expense, PersonId, Session } from "./types"

function sharesOf(expense: Expense): Record<PersonId, number> {
  if (expense.splitType === "exact") {
    return exactShares(expense.amountCents, expense.exactCents ?? {})
  }
  return equalShares(expense.amountCents, expense.participantIds, expense.id)
}

export function balances(session: Session): Record<PersonId, number> {
  const nets: Record<PersonId, number> = {}
  for (const person of session.people) nets[person.id] = 0

  for (const expense of session.expenses) {
    if (expense.paidBy in nets) nets[expense.paidBy] += expense.amountCents
    const shares = sharesOf(expense)
    for (const [id, share] of Object.entries(shares)) {
      if (id in nets) nets[id] -= share
    }
  }
  return nets
}
