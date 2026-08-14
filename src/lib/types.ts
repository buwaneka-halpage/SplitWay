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
