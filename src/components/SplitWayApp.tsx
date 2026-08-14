"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
} from "@/lib";

const emptySession: Session = { people: [], expenses: [] };

function newId(): string {
  return crypto.randomUUID();
}

function personName(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? id;
}

function isPersonReferenced(session: Session, personId: string): boolean {
  return session.expenses.some(
    (expense) =>
      expense.paidBy === personId || expense.participantIds.includes(personId),
  );
}

function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function parseCents(raw: string, allowZero: boolean): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const cents = toCents(trimmed);
    if (!Number.isInteger(cents)) return null;
    if (allowZero ? cents < 0 : cents <= 0) return null;
    return cents;
  } catch {
    return null;
  }
}

type ExpenseFormState = {
  amount: string;
  paidBy: string;
  participantIds: string[];
  splitType: SplitType;
  exactAmounts: Record<string, string>;
};

function emptyForm(): ExpenseFormState {
  return {
    amount: "",
    paidBy: "",
    participantIds: [],
    splitType: "equal",
    exactAmounts: {},
  };
}

function formFromExpense(expense: Expense): ExpenseFormState {
  const exactAmounts: Record<string, string> = {};
  if (expense.splitType === "exact" && expense.exactCents) {
    for (const [id, cents] of Object.entries(expense.exactCents)) {
      exactAmounts[id] = centsToInput(cents);
    }
  }
  return {
    amount: centsToInput(expense.amountCents),
    paidBy: expense.paidBy,
    participantIds: [...expense.participantIds],
    splitType: expense.splitType,
    exactAmounts,
  };
}

const fieldClass =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900";
const btnClass =
  "rounded border border-zinc-400 px-3 py-1 text-sm dark:border-zinc-500";

export function SplitWayApp() {
  const [session, setSession] = useState<Session>(emptySession);
  const [name, setName] = useState("");
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(load());
  }, []);

  const nets = useMemo(() => balances(session), [session]);
  const transfers = useMemo(() => settle(nets), [nets]);
  const netSum = Object.values(nets).reduce((sum, net) => sum + net, 0);

  function commit(next: Session) {
    save(next);
    setSession(next);
  }

  function addPerson(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const person: Person = { id: newId(), name: trimmed };
    commit({ ...session, people: [...session.people, person] });
    setName("");
  }

  function removePerson(personId: string) {
    if (isPersonReferenced(session, personId)) return;
    commit({
      ...session,
      people: session.people.filter((person) => person.id !== personId),
    });
  }

  function toggleParticipant(personId: string) {
    setForm((current) => {
      const selected = current.participantIds.includes(personId);
      const participantIds = selected
        ? current.participantIds.filter((id) => id !== personId)
        : [...current.participantIds, personId];
      const exactAmounts = { ...current.exactAmounts };
      if (selected) delete exactAmounts[personId];
      return { ...current, participantIds, exactAmounts };
    });
  }

  function resetExpenseForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError("");
  }

  function startEdit(expense: Expense) {
    setForm(formFromExpense(expense));
    setEditingId(expense.id);
    setError("");
  }

  function submitExpense(event: FormEvent) {
    event.preventDefault();
    setError("");

    const amountCents = parseCents(form.amount, false);
    if (amountCents === null) {
      setError("Enter a positive amount in LKR.");
      return;
    }
    if (!form.paidBy) {
      setError("Select who paid.");
      return;
    }
    if (form.participantIds.length === 0) {
      setError("Select at least one participant.");
      return;
    }

    let exactCents: Record<string, number> | undefined;
    if (form.splitType === "exact") {
      exactCents = {};
      for (const id of form.participantIds) {
        const share = parseCents(form.exactAmounts[id] ?? "", true);
        if (share === null) {
          setError("Enter an exact amount for each checked person.");
          return;
        }
        exactCents[id] = share;
      }
      try {
        exactShares(amountCents, exactCents);
      } catch {
        setError("Exact amounts must sum to the expense total.");
        return;
      }
    }

    const expense: Expense = {
      id: editingId ?? newId(),
      amountCents,
      paidBy: form.paidBy,
      participantIds: [...form.participantIds],
      splitType: form.splitType,
      ...(exactCents ? { exactCents } : {}),
    };

    const expenses = editingId
      ? session.expenses.map((item) => (item.id === editingId ? expense : item))
      : [...session.expenses, expense];

    commit({ ...session, expenses });
    resetExpenseForm();
  }

  function deleteExpense(expenseId: string) {
    commit({
      ...session,
      expenses: session.expenses.filter((expense) => expense.id !== expenseId),
    });
    if (editingId === expenseId) resetExpenseForm();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">SplitWay</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Single-session LKR splitter. Saved in this browser.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">People</h2>
        <form className="flex flex-wrap items-end gap-2" onSubmit={addPerson}>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button className={btnClass} type="submit">
            Add
          </button>
        </form>
        {session.people.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No people yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {session.people.map((person) => {
              const referenced = isPersonReferenced(session, person.id);
              return (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-3 border-b border-zinc-200 py-1 dark:border-zinc-800"
                >
                  <span>{person.name}</span>
                  <button
                    className={btnClass}
                    type="button"
                    disabled={referenced}
                    title={
                      referenced
                        ? "Remove is disabled while this person is on an expense"
                        : undefined
                    }
                    onClick={() => removePerson(person.id)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <form className="flex flex-col gap-3" onSubmit={submitExpense}>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            Amount (LKR)
            <input
              className={fieldClass}
              inputMode="decimal"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </label>
          <label className="flex max-w-xs flex-col gap-1 text-sm">
            Payer
            <select
              className={fieldClass}
              value={form.paidBy}
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
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm">Participants</legend>
            {session.people.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add people before logging an expense.
              </p>
            ) : (
              session.people.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.participantIds.includes(person.id)}
                    onChange={() => toggleParticipant(person.id)}
                  />
                  {person.name}
                </label>
              ))
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm">Split type</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="splitType"
                checked={form.splitType === "equal"}
                onChange={() =>
                  setForm((current) => ({ ...current, splitType: "equal" }))
                }
              />
              Equal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="splitType"
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
              <legend className="text-sm">Exact amounts (LKR)</legend>
              {form.participantIds.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Check participants to enter their amounts.
                </p>
              ) : (
                form.participantIds.map((id) => (
                  <label key={id} className="flex max-w-xs flex-col gap-1 text-sm">
                    {personName(session.people, id)}
                    <input
                      className={fieldClass}
                      inputMode="decimal"
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
                  </label>
                ))
              )}
            </fieldset>
          )}
          {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <button className={btnClass} type="submit">
              {editingId ? "Save expense" : "Add expense"}
            </button>
            {editingId ? (
              <button className={btnClass} type="button" onClick={resetExpenseForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        {session.expenses.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No expenses yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {session.expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-start justify-between gap-3 border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="text-sm">
                  <p>
                    {formatLkr(expense.amountCents)} paid by{" "}
                    {personName(session.people, expense.paidBy)} ({expense.splitType}
                    )
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Participants:{" "}
                    {expense.participantIds
                      .map((id) => personName(session.people, id))
                      .join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className={btnClass}
                    type="button"
                    onClick={() => startEdit(expense)}
                  >
                    Edit
                  </button>
                  <button
                    className={btnClass}
                    type="button"
                    onClick={() => deleteExpense(expense.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Balances</h2>
        {session.people.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No balances yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {session.people.map((person) => {
              const net = nets[person.id] ?? 0;
              const meaning =
                net > 0 ? "owed (group owes them)" : net < 0 ? "owes" : "settled";
              return (
                <li key={person.id}>
                  {person.name}: {formatLkr(net)} — {meaning}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm">Sum: {formatLkr(netSum)}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Settle Up</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Everyone is at {formatLkr(0)}.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {transfers.map((transfer) => (
              <li key={`${transfer.from}-${transfer.to}-${transfer.amountCents}`}>
                {personName(session.people, transfer.from)} pays{" "}
                {personName(session.people, transfer.to)} {formatLkr(transfer.amountCents)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
