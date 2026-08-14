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

export type GroupId = string

export type Group = Session & { id: GroupId; name: string }

export type Transfer = { from: PersonId; to: PersonId; amountCents: number }
