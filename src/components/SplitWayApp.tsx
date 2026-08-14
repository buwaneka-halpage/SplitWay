"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  balances,
  exactShares,
  formatLkr,
  load,
  save,
  settle,
  toCents,
  type Expense,
  type Person,
  type Session,
  type SplitType,
} from "@/lib"
import { cn } from "@/lib/utils"
import { BottomNav } from "@/components/BottomNav"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

const emptySession: Session = { people: [], expenses: [] }

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm"

function newId(): string {
  return crypto.randomUUID()
}

function personName(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? id
}

function isPersonReferenced(session: Session, personId: string): boolean {
  return session.expenses.some(
    (expense) =>
      expense.paidBy === personId || expense.participantIds.includes(personId),
  )
}

function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(Math.trunc(cents))
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}

function parseCents(raw: string, allowZero: boolean): number | null {
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

type ExpenseFormState = {
  amount: string
  paidBy: string
  participantIds: string[]
  splitType: SplitType
  exactAmounts: Record<string, string>
}

function emptyForm(): ExpenseFormState {
  return {
    amount: "",
    paidBy: "",
    participantIds: [],
    splitType: "equal",
    exactAmounts: {},
  }
}

function formFromExpense(expense: Expense): ExpenseFormState {
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

function NetRow({
  name,
  net,
}: {
  name: string
  net: number
}) {
  const meaning =
    net > 0 ? "owed (group owes them)" : net < 0 ? "owes" : "settled"
  return (
    <li
      data-testid={`balance-${name}`}
      className="flex items-center justify-between gap-3 py-1.5"
    >
      <span>{name}</span>
      <span
        className={cn(
          "text-sm font-medium",
          net > 0 && "text-emerald-600 dark:text-emerald-400",
          net < 0 && "text-red-600 dark:text-red-400",
          net === 0 && "text-muted-foreground",
        )}
      >
        {formatLkr(net)} — {meaning}
      </span>
    </li>
  )
}

export function SplitWayApp() {
  const [session, setSession] = useState<Session>(emptySession)
  const [name, setName] = useState("")
  const [form, setForm] = useState<ExpenseFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    setSession(load())
  }, [])

  const nets = useMemo(() => balances(session), [session])
  const transfers = useMemo(() => settle(nets), [nets])
  const netSum = Object.values(nets).reduce((sum, net) => sum + net, 0)

  function commit(next: Session) {
    save(next)
    setSession(next)
  }

  function addPerson(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const person: Person = { id: newId(), name: trimmed }
    commit({ ...session, people: [...session.people, person] })
    setName("")
  }

  function removePerson(personId: string) {
    if (isPersonReferenced(session, personId)) return
    commit({
      ...session,
      people: session.people.filter((person) => person.id !== personId),
    })
  }

  function toggleParticipant(personId: string) {
    setForm((current) => {
      const selected = current.participantIds.includes(personId)
      const participantIds = selected
        ? current.participantIds.filter((id) => id !== personId)
        : [...current.participantIds, personId]
      const exactAmounts = { ...current.exactAmounts }
      if (selected) delete exactAmounts[personId]
      return { ...current, participantIds, exactAmounts }
    })
  }

  function resetExpenseForm() {
    setForm(emptyForm())
    setEditingId(null)
    setError("")
  }

  function startEdit(expense: Expense) {
    setForm(formFromExpense(expense))
    setEditingId(expense.id)
    setError("")
  }

  function submitExpense(event: FormEvent) {
    event.preventDefault()
    setError("")

    const amountCents = parseCents(form.amount, false)
    if (amountCents === null) {
      setError("Enter a positive amount in LKR.")
      return
    }
    if (!form.paidBy) {
      setError("Select who paid.")
      return
    }
    if (form.participantIds.length === 0) {
      setError("Select at least one participant.")
      return
    }

    let exactCents: Record<string, number> | undefined
    if (form.splitType === "exact") {
      exactCents = {}
      for (const id of form.participantIds) {
        const share = parseCents(form.exactAmounts[id] ?? "", true)
        if (share === null) {
          setError("Enter an exact amount for each checked person.")
          return
        }
        exactCents[id] = share
      }
      try {
        exactShares(amountCents, exactCents)
      } catch {
        setError("Exact amounts must sum to the expense total.")
        return
      }
    }

    const expense: Expense = {
      id: editingId ?? newId(),
      amountCents,
      paidBy: form.paidBy,
      participantIds: [...form.participantIds],
      splitType: form.splitType,
      ...(exactCents ? { exactCents } : {}),
    }

    const expenses = editingId
      ? session.expenses.map((item) => (item.id === editingId ? expense : item))
      : [...session.expenses, expense]

    commit({ ...session, expenses })
    resetExpenseForm()
  }

  function deleteExpense(expenseId: string) {
    commit({
      ...session,
      expenses: session.expenses.filter((expense) => expense.id !== expenseId),
    })
    if (editingId === expenseId) resetExpenseForm()
  }

  const peopleCard = (
    <Card id="people" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>Add anyone in the group. No login.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-wrap items-end gap-2" onSubmit={addPerson}>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              data-testid="person-name"
              className="h-11 md:h-8"
            />
          </div>
          <Button type="submit" data-testid="person-add" className="min-h-11 md:min-h-8">
            Add
          </Button>
        </form>
        {session.people.length === 0 ? (
          <p className="text-muted-foreground text-sm">No people yet.</p>
        ) : (
          <ul className="flex flex-col">
            {session.people.map((person) => {
              const referenced = isPersonReferenced(session, person.id)
              return (
                <li
                  key={person.id}
                  className="flex min-h-11 items-center justify-between gap-3 border-b last:border-b-0"
                  data-testid={`person-${person.name}`}
                >
                  <span>{person.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={referenced}
                    data-testid={`person-remove-${person.name}`}
                    title={
                      referenced
                        ? "Remove is disabled while this person is on an expense"
                        : undefined
                    }
                    onClick={() => removePerson(person.id)}
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  const expensesCard = (
    <Card id="expenses" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>Equal split or exact amounts in LKR.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-col gap-4" onSubmit={submitExpense}>
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="expense-amount">Amount (LKR)</Label>
            <Input
              id="expense-amount"
              inputMode="decimal"
              value={form.amount}
              data-testid="expense-amount"
              className="h-11 md:h-8"
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </div>
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="expense-payer">Payer</Label>
            <select
              id="expense-payer"
              className={selectClass}
              value={form.paidBy}
              data-testid="expense-payer"
              onChange={(event) =>
                setForm((current) => ({ ...current, paidBy: event.target.value }))
              }
            >
              <option value="">Select payer</option>
              {session.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Participants</legend>
            {session.people.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add people before logging an expense.
              </p>
            ) : (
              session.people.map((person) => (
                <label
                  key={person.id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <Checkbox
                    checked={form.participantIds.includes(person.id)}
                    data-testid={`participant-${person.name}`}
                    onCheckedChange={() => toggleParticipant(person.id)}
                    className="size-5"
                  />
                  {person.name}
                </label>
              ))
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Split type</legend>
            <RadioGroup
              value={form.splitType}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  splitType: value as SplitType,
                }))
              }
            >
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <RadioGroupItem value="equal" data-testid="split-equal" className="size-5" />
                Equal
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <RadioGroupItem value="exact" data-testid="split-exact" className="size-5" />
                Exact
              </label>
            </RadioGroup>
          </fieldset>
          {form.splitType === "exact" && (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium">Exact amounts (LKR)</legend>
              {form.participantIds.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Check participants to enter their amounts.
                </p>
              ) : (
                form.participantIds.map((id) => (
                  <div key={id} className="flex max-w-xs flex-col gap-1.5">
                    <Label>{personName(session.people, id)}</Label>
                    <Input
                      inputMode="decimal"
                      data-testid={`exact-${personName(session.people, id)}`}
                      value={form.exactAmounts[id] ?? ""}
                      className="h-11 md:h-8"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          exactAmounts: {
                            ...current.exactAmounts,
                            [id]: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))
              )}
            </fieldset>
          )}
          {error ? (
            <Alert variant="destructive" data-testid="form-error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" data-testid="expense-submit" className="min-h-11 md:min-h-8">
              {editingId ? "Save expense" : "Add expense"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetExpenseForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
        <Separator />
        {session.expenses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {session.expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                data-testid={`expense-${expense.id}`}
              >
                <div className="text-sm">
                  <p>
                    {formatLkr(expense.amountCents)} paid by{" "}
                    {personName(session.people, expense.paidBy)} ({expense.splitType})
                  </p>
                  <p className="text-muted-foreground">
                    Participants:{" "}
                    {expense.participantIds
                      .map((id) => personName(session.people, id))
                      .join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`expense-edit-${expense.id}`}
                    onClick={() => startEdit(expense)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`expense-delete-${expense.id}`}
                    onClick={() => deleteExpense(expense.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  const balancesCard = (
    <Card id="balances" className="scroll-mt-20" data-testid="balances">
      <CardHeader>
        <CardTitle>Balances</CardTitle>
        <CardDescription>Net owed or owing, in LKR.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {session.people.length === 0 ? (
          <p className="text-muted-foreground text-sm">No balances yet.</p>
        ) : (
          <ul className="flex flex-col">
            {session.people.map((person) => (
              <NetRow
                key={person.id}
                name={person.name}
                net={nets[person.id] ?? 0}
              />
            ))}
          </ul>
        )}
        <p className="text-sm font-medium" data-testid="balance-sum">
          Sum: {formatLkr(netSum)}
        </p>
      </CardContent>
    </Card>
  )

  const settleCard = (
    <Card id="settle" className="scroll-mt-20" data-testid="settle-up">
      <CardHeader>
        <CardTitle>Settle Up</CardTitle>
        <CardDescription>Fewest payments to zero every net.</CardDescription>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Everyone is at {formatLkr(0)}.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transfers.map((transfer) => (
              <li
                key={`${transfer.from}-${transfer.to}-${transfer.amountCents}`}
                data-testid="settle-row"
                className="flex min-h-11 items-center justify-between gap-3 text-sm"
              >
                <span>
                  {personName(session.people, transfer.from)} →{" "}
                  {personName(session.people, transfer.to)}
                </span>
                <Badge variant="secondary">{formatLkr(transfer.amountCents)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-24 md:pb-8">
        <header
          className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-20 border-b px-4 py-3 backdrop-blur md:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">SplitWay</h1>
          <p className="text-muted-foreground text-sm">Saved in this browser.</p>
        </header>

        <main className="flex flex-col gap-4 px-4 py-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:px-6 md:py-6">
          <div className="flex flex-col gap-4">
            {peopleCard}
            {expensesCard}
          </div>
          <div className="flex flex-col gap-4 md:sticky md:top-20">
            {balancesCard}
            {settleCard}
          </div>
        </main>
      </div>
      <BottomNav />
    </>
  )
}
