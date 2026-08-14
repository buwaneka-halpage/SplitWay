"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { exactShares, formatLkr, type Expense, type Group, type SplitType } from "@/lib"
import { formFromExpense, newId, parseCents, personName, todayDate } from "@/lib/form"
import { useGroup } from "@/components/GroupShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ExpenseFormState = {
  amount: string
  description: string
  date: string
  paidBy: string
  participantIds: string[]
  splitType: SplitType
  exactAmounts: Record<string, string>
}

function emptyForm(
  group: Group,
  last?: { lastPaidBy?: string; lastParticipantIds?: string[] },
): ExpenseFormState {
  const ids = new Set(group.people.map((person) => person.id))
  const lastPaidBy = last?.lastPaidBy ?? group.lastPaidBy
  const lastParticipantIds = last?.lastParticipantIds ?? group.lastParticipantIds
  return {
    amount: "",
    description: "",
    date: todayDate(),
    paidBy: lastPaidBy && ids.has(lastPaidBy) ? lastPaidBy : "",
    participantIds: (lastParticipantIds ?? []).filter((id) => ids.has(id)),
    splitType: "equal",
    exactAmounts: {},
  }
}

function exactRemainderText(
  amount: string,
  participantIds: string[],
  exactAmounts: Record<string, string>,
): string | null {
  if (participantIds.length === 0) return null
  const amountCents = parseCents(amount, false)
  if (amountCents === null) return null
  let sum = 0
  for (const id of participantIds) {
    const share = parseCents(exactAmounts[id] ?? "", true)
    if (share === null) return null
    sum += share
  }
  const remainder = amountCents - sum
  if (remainder > 0) return `${formatLkr(remainder)} left to assign`
  if (remainder < 0) return `${formatLkr(-remainder)} over`
  return "Amounts sum to the total"
}

const fieldClass = "h-11 text-base md:h-9 md:text-sm"

export function ExpensesPanel() {
  const { group, commit } = useGroup()
  const [form, setForm] = useState<ExpenseFormState>(() => emptyForm(group))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState("")

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

  function splitAll() {
    setForm((current) => ({
      ...current,
      participantIds: group.people.map((person) => person.id),
    }))
  }

  function resetExpenseForm(last?: { lastPaidBy?: string; lastParticipantIds?: string[] }) {
    setForm(emptyForm(group, last))
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

    const description = form.description.trim()
    const date = form.date.trim()
    const expense: Expense = {
      id: editingId ?? newId(),
      amountCents,
      paidBy: form.paidBy,
      participantIds: [...form.participantIds],
      splitType: form.splitType,
      ...(description ? { description } : {}),
      ...(date ? { date } : {}),
      ...(exactCents ? { exactCents } : {}),
    }

    const expenses = editingId
      ? group.expenses.map((item) => (item.id === editingId ? expense : item))
      : [...group.expenses, expense]

    const lastPaidBy = form.paidBy
    const lastParticipantIds = [...form.participantIds]
    commit({ ...group, expenses, lastPaidBy, lastParticipantIds })
    resetExpenseForm({ lastPaidBy, lastParticipantIds })
  }

  function deleteExpense(expenseId: string) {
    commit({
      ...group,
      expenses: group.expenses.filter((expense) => expense.id !== expenseId),
    })
    if (editingId === expenseId) resetExpenseForm()
  }

  const remainder = form.splitType === "exact"
    ? exactRemainderText(form.amount, form.participantIds, form.exactAmounts)
    : null

  return (
    <section className="flex flex-col gap-4 px-4 py-4 md:grid md:grid-cols-[minmax(18rem,22rem)_1fr] md:items-start md:gap-8 md:px-8 md:py-6">
      <h2 className="text-lg font-semibold md:col-span-2">Expenses</h2>
      <form className="flex flex-col gap-3 md:sticky md:top-4" onSubmit={submitExpense}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-amount">Amount (LKR)</Label>
          <Input
            id="expense-amount"
            className={fieldClass}
            inputMode="decimal"
            value={form.amount}
            data-testid="expense-amount"
            onChange={(event) =>
              setForm((current) => ({ ...current, amount: event.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-description">Description</Label>
          <Input
            id="expense-description"
            className={fieldClass}
            value={form.description}
            placeholder="Dinner, hotel, fuel…"
            autoComplete="off"
            data-testid="expense-description"
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-date">Date</Label>
          <input
            id="expense-date"
            type="date"
            className={`${fieldClass} rounded-lg border border-input bg-background px-2.5`}
            value={form.date}
            data-testid="expense-date"
            onChange={(event) =>
              setForm((current) => ({ ...current, date: event.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-payer">Payer</Label>
          <select
            id="expense-payer"
            className={`${fieldClass} rounded-lg border border-input bg-background px-2.5`}
            value={form.paidBy}
            data-testid="expense-payer"
            onChange={(event) =>
              setForm((current) => ({ ...current, paidBy: event.target.value }))
            }
          >
            <option value="">Select payer</option>
            {group.people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Participants</legend>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            data-testid="split-all"
            onClick={splitAll}
          >
            Split among all
          </Button>
          {group.people.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add people before logging an expense.{" "}
              <Link href={`/groups/${group.id}/people`} className="text-primary">
                People
              </Link>
            </p>
          ) : (
            group.people.map((person) => (
              <label key={person.id} className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={form.participantIds.includes(person.id)}
                  data-testid={`participant-${person.name}`}
                  onChange={() => toggleParticipant(person.id)}
                />
                {person.name}
              </label>
            ))
          )}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Split type</legend>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="radio"
              name="splitType"
              className="size-4 accent-primary"
              data-testid="split-equal"
              checked={form.splitType === "equal"}
              onChange={() =>
                setForm((current) => ({ ...current, splitType: "equal" }))
              }
            />
            Equal
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="radio"
              name="splitType"
              className="size-4 accent-primary"
              data-testid="split-exact"
              checked={form.splitType === "exact"}
              onChange={() =>
                setForm((current) => ({ ...current, splitType: "exact" }))
              }
            />
            Exact
          </label>
        </fieldset>
        {form.splitType === "exact" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Exact amounts (LKR)</legend>
            {form.participantIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Check participants to enter their amounts.
              </p>
            ) : (
              form.participantIds.map((id) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <Label htmlFor={`exact-${id}`}>{personName(group.people, id)}</Label>
                  <Input
                    id={`exact-${id}`}
                    className={fieldClass}
                    inputMode="decimal"
                    data-testid={`exact-${personName(group.people, id)}`}
                    value={form.exactAmounts[id] ?? ""}
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
            {remainder ? (
              <p className="text-sm text-muted-foreground" data-testid="exact-remainder">
                {remainder}
              </p>
            ) : null}
          </fieldset>
        )}
        {error ? (
          <p className="text-sm text-destructive" data-testid="form-error">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button className="h-11 md:h-9" type="submit" data-testid="expense-submit">
            {editingId ? "Save expense" : "Add expense"}
          </Button>
          {editingId ? (
            <Button className="h-11 md:h-9" variant="outline" type="button" onClick={() => resetExpenseForm()}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      {group.expenses.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
          {group.people.length === 0 ? (
            <Link href={`/groups/${group.id}/people`} className="text-sm text-primary">
              People
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-fit md:h-9"
              data-testid="empty-add-expense"
              onClick={() => document.getElementById("expense-amount")?.focus()}
            >
              Add the first expense
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {group.expenses.map((expense) => (
            <li key={expense.id} data-testid={`expense-${expense.id}`}>
              <Card size="sm">
                <CardContent className="flex items-start justify-between gap-3">
                  <div>
                    {expense.description ? (
                      <p className="font-medium" data-testid={`expense-desc-${expense.id}`}>
                        {expense.description}
                      </p>
                    ) : null}
                    <p className={expense.description ? "text-muted-foreground" : "font-medium"}>
                      {formatLkr(expense.amountCents)} paid by{" "}
                      {personName(group.people, expense.paidBy)} ({expense.splitType})
                    </p>
                    {expense.date ? (
                      <p className="text-muted-foreground">{expense.date}</p>
                    ) : null}
                    <p className="text-muted-foreground">
                      Participants:{" "}
                      {expense.participantIds
                        .map((id) => personName(group.people, id))
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      data-testid={`expense-edit-${expense.id}`}
                      onClick={() => startEdit(expense)}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          data-testid={`expense-delete-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            data-testid="expense-delete-confirm"
                            onClick={() => deleteExpense(expense.id)}
                          >
                            Delete expense
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
