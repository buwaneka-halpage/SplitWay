"use client"

import { useMemo } from "react"
import { balances, formatLkr, settle, transferKey } from "@/lib"
import { personName } from "@/lib/form"
import { useGroup } from "@/components/GroupShell"
import { Card, CardContent } from "@/components/ui/card"

export function SettlePanel() {
  const { group, commit } = useGroup()
  const nets = useMemo(() => balances(group), [group])
  const transfers = useMemo(() => settle(nets), [nets])

  function toggleSettled(key: string) {
    const settledKeys = [...(group.settledKeys ?? [])]
    const index = settledKeys.indexOf(key)
    if (index >= 0) {
      settledKeys.splice(index, 1)
    } else {
      settledKeys.push(key)
    }
    commit({ ...group, settledKeys })
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:px-8 md:py-6" data-testid="settle-up">
      <h2 className="text-lg font-semibold">Settle Up</h2>
      {transfers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone is at {formatLkr(0)}.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Tick when you have paid. This does not change balances.
          </p>
          <ul className="flex flex-col gap-2">
            {transfers.map((transfer) => {
              const key = transferKey(transfer)
              const done = (group.settledKeys ?? []).includes(key)
              return (
                <li
                  key={`${transfer.from}-${transfer.to}-${transfer.amountCents}`}
                  data-testid="settle-row"
                >
                  <Card size="sm">
                    <CardContent>
                      <label className="flex min-h-10 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-primary"
                          checked={done}
                          data-testid="settle-done"
                          onChange={() => toggleSettled(key)}
                        />
                        <span className={done ? "text-muted-foreground line-through" : undefined}>
                          {personName(group.people, transfer.from)} pays{" "}
                          {personName(group.people, transfer.to)}{" "}
                          <span className="font-medium">{formatLkr(transfer.amountCents)}</span>
                        </span>
                      </label>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
