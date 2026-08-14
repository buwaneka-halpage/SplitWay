"use client"

import { useMemo } from "react"
import { balances, formatLkr } from "@/lib"
import { useGroup } from "@/components/GroupShell"

export function BalancesPanel() {
  const { group } = useGroup()
  const nets = useMemo(() => balances(group), [group])
  const netSum = Object.values(nets).reduce((sum, net) => sum + net, 0)

  return (
    <section className="flex flex-col gap-4 px-4 py-4 md:px-8 md:py-6" data-testid="balances">
      <h2 className="text-lg font-semibold">Balances</h2>
      {group.people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No balances yet.</p>
      ) : (
        <ul className="flex flex-col md:grid md:grid-cols-2 md:gap-3">
          {group.people.map((person) => {
            const net = nets[person.id] ?? 0
            const meaning =
              net > 0 ? "owed (group owes them)" : net < 0 ? "owes" : "settled"
            return (
              <li
                key={person.id}
                className="flex items-baseline justify-between gap-3 border-b py-3 md:rounded-xl md:border md:px-4 md:py-4"
                data-testid={`balance-${person.name}`}
              >
                <span>
                  {person.name}
                  <span className="ml-2 text-xs text-muted-foreground">{meaning}</span>
                </span>
                <span className={net < 0 ? "font-medium text-destructive" : "font-medium"}>
                  {formatLkr(net)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-sm text-muted-foreground" data-testid="balance-sum">
        Sum: {formatLkr(netSum)}
      </p>
    </section>
  )
}
