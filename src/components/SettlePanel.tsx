"use client"

import { useMemo } from "react"
import { balances, formatLkr, settle } from "@/lib"
import { personName } from "@/lib/form"
import { useGroup } from "@/components/GroupShell"
import { Card, CardContent } from "@/components/ui/card"

export function SettlePanel() {
  const { group } = useGroup()
  const nets = useMemo(() => balances(group), [group])
  const transfers = useMemo(() => settle(nets), [nets])

  return (
    <section className="flex flex-col gap-4 px-4 py-4" data-testid="settle-up">
      <h2 className="text-lg font-semibold">Settle Up</h2>
      {transfers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone is at {formatLkr(0)}.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {transfers.map((transfer) => (
            <li
              key={`${transfer.from}-${transfer.to}-${transfer.amountCents}`}
              data-testid="settle-row"
            >
              <Card size="sm">
                <CardContent>
                  {personName(group.people, transfer.from)} pays{" "}
                  {personName(group.people, transfer.to)}{" "}
                  <span className="font-medium">{formatLkr(transfer.amountCents)}</span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
