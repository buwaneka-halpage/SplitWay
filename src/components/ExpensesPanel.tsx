"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { exactShares, formatLkr, type Expense, type SplitType } from "@/lib"
import { formFromExpense, newId, parseCents, personName } from "@/lib/form"
import { useGroup } from "@/components/GroupShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

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

const fieldClass = "h-11 text-base"

export function ExpensesPanel() {
  const { group, commit } = useGroup()
  const [form, setForm] = useState<ExpenseFormState>(emptyForm)
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
      ? group.expenses.map((item) => (item.id === editingId ? expense : item))
      : [...group.expenses, expense]

    commit({ ...group, expenses })
    resetExpenseForm()
  }

  function deleteExpense(expenseId: string) {
    commit({
      ...group,
      expenses: group.expenses.filter((expense) => expense.id !== expenseId),
    })
    if (editingId === expenseId) resetExpenseForm()
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4">
      <h2 className="text-lg font-semibold">Expenses</h2>
      <form className="flex flex-col gap-3" onSubmit={submitExpense}>
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
          </fieldset>
        )}
        {error ? (
          <p className="text-sm text-destructive" data-testid="form-error">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button className="h-11" type="submit" data-testid="expense-submit">
            {editingId ? "Save expense" : "Add expense"}
          </Button>
          {editingId ? (
            <Button className="h-11" variant="outline" type="button" onClick={resetExpenseForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
      {group.expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {group.expenses.map((expense) => (
            <li key={expense.id} data-testid={`expense-${expense.id}`}>
              <Card size="sm">
                <CardContent className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatLkr(expense.amountCents)} paid by{" "}
                      {personName(group.people, expense.paidBy)} ({expense.splitType})
                    </p>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      data-testid={`expense-delete-${expense.id}`}
                      onClick={() => deleteExpense(expense.id)}
                    >
                      Delete
                    </Button>
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
