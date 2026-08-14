export type PersonId = string

export type Person = { id: PersonId; name: string }

export type SplitType = "equal" | "exact"

export type Expense = {
  id: string
  amountCents: number
  paidBy: PersonId
  participantIds: PersonId[]
  splitType: SplitType
  description?: string
  /** Local calendar day `YYYY-MM-DD`. Absent on rows logged before dates existed. */
  date?: string
  exactCents?: Record<PersonId, number>
}

export type Session = { people: Person[]; expenses: Expense[] }

export type GroupId = string

export type Group = Session & {
  id: GroupId
  name: string
  /** `transferKey` values the user ticked as paid. Does not change settle math. */
  settledKeys?: string[]
  lastPaidBy?: PersonId
  lastParticipantIds?: PersonId[]
}

export type Transfer = { from: PersonId; to: PersonId; amountCents: number }
